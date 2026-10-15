import {build} from 'esbuild';
import {mkdir,copyFile,readFile,readdir,rm,stat,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {renderArticle} from '../site/document-links.mjs';
import {validateDocumentationBundle} from '../src/site-shared/build-contract.mjs';
import {validateUpstreamSource} from '../src/site-shared/source-provenance.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const out=path.join(root,'site/dist');
async function walk(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const next=path.join(dir,entry.name);if(entry.isDirectory())files.push(...await walk(next));else if(entry.name.endsWith('.md'))files.push(next)}return files.sort()}
const documentFiles=await walk(path.join(root,'docs')),documentSources=new Set(documentFiles.map(file=>path.relative(root,file).split(path.sep).join('/')));
const articles=await Promise.all(documentFiles.map(async file=>{const source=path.relative(root,file).split(path.sep).join('/'),body=await readFile(file,'utf8'),title=body.match(/^#\s+(.+)$/m)?.[1]??path.basename(file,'.md');if(/https?:\/\/[^\s<>"`]*\.chatgpt\.site\b|(?:\/workspace\/|\/home\/[^\s/]+\/)/i.test(body))throw Error(`Public documentation contains a private hosting address or machine path: ${source}`);return {id:source.slice(5,-3),title,source,body,html:renderArticle(body,source,documentSources)}}));
validateDocumentationBundle((await walk(path.join(root,'docs'))).map(file=>path.relative(root,file).split(path.sep).join('/')),articles);
const gallery=JSON.parse(await readFile(path.join(root,'site/gallery.json'),'utf8'));
if(gallery.schemaVersion!==1||!Array.isArray(gallery.captures))throw Error('Invalid gallery manifest');
const currentSourceCommit=gallery.currentSourceCommit??null;
if(currentSourceCommit!==null&&!/^[a-f0-9]{40}$/.test(currentSourceCommit))throw Error('Current gallery source must be an exact reviewed commit');
const currentCaptures=gallery.captures.filter(capture=>capture.sourceCommit===currentSourceCommit);
if(process.argv.includes('--require-reviewed-current')&&!currentCaptures.length)throw Error('Public deployment requires reviewed current application captures. Historical images cannot satisfy this gate.');
const wiki=JSON.parse(await readFile(path.join(root,'site/wiki-status.json'),'utf8'));
if(wiki.schemaVersion!==1||wiki.status!=='unavailable'||wiki.sourceCommit!==null||!Array.isArray(wiki.articles)||wiki.articles.length)throw Error('Wiki provenance requires a reviewed source integration');
let commit='',updatedAt='',dirty=false;try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();updatedAt=execFileSync('git',['show','-s','--format=%cI',commit],{cwd:root,encoding:'utf8'}).trim();dirty=Boolean(execFileSync('git',['status','--porcelain','--untracked-files=no','--','site','src/site-shared','src/shared','docs','scripts/build-site.mjs','package.json','assets'],{cwd:root,encoding:'utf8'}).trim());if(dirty)updatedAt=''}catch{}
let hostingPresent=false;try{hostingPresent=(await stat(path.join(root,'.openai/hosting.json'))).isFile()}catch(error){if(error.code!=='ENOENT')throw error}
if(hostingPresent){let record;try{record=JSON.parse(await readFile(path.join(root,'.openai/upstream-source.json'),'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}const upstream=validateUpstreamSource(record,true);if(upstream){commit=upstream.commit;updatedAt=upstream.updatedAt;dirty=false}}
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
if(process.argv.includes('--require-reviewed-current')&&dirty)throw Error('Public deployment requires clean reviewed website inputs');
const define={__SITE_DIRTY__:JSON.stringify(dirty),__SITE_VERSION__:JSON.stringify(pkg.version),__SITE_COMMIT__:JSON.stringify(commit),__SITE_UPDATED_AT__:JSON.stringify(updatedAt),__SITE_DOCS__:JSON.stringify(articles),__SITE_GALLERY__:JSON.stringify(gallery.captures),__SITE_CURRENT_CAPTURE_SOURCE__:JSON.stringify(currentSourceCommit)};
await build({entryPoints:[path.join(root,'site/app.ts')],outfile:path.join(out,'app.js'),bundle:true,format:'esm',target:'es2022',minify:true,define});
await build({entryPoints:[path.join(root,'site/regex-worker.ts')],outfile:path.join(out,'regex-worker.js'),bundle:true,format:'esm',target:'es2022',minify:true});
await Promise.all(['index.html','style.css'].map(file=>copyFile(path.join(root,'site',file),path.join(out,file))));
await Promise.all(['icon.svg','icon.png'].map(file=>copyFile(path.join(root,'assets',file),path.join(out,file))));
const captureReceipts=JSON.parse(await readFile(path.join(root,'docs/images/captures.json'),'utf8'));
for(const item of gallery.captures){if(!/^docs\/images\/[a-z0-9][a-z0-9._-]*\.(png|webp|jpg)$/.test(item.file)||!(/^[a-f0-9]{40}$/.test(item.sourceCommit))||!Number.isFinite(Date.parse(item.capturedAt)))throw Error('Gallery requires reviewed local images and capture provenance');const asset=path.join(root,item.file);if(!(await stat(asset)).isFile())throw Error('Gallery capture is missing');const bytes=await readFile(asset),hash=createHash('sha256').update(bytes).digest('hex'),records=captureReceipts.captures.filter(record=>record.file===item.file);if(records.length!==1||records[0].sha256!==hash||records[0].sourceCommit!==item.sourceCommit||records[0].capturedAt!==item.capturedAt)throw Error('Gallery capture does not match its source receipt');if(hash==='b22f56f57c30103622e3cd4ac5a106a50335964760f5bf64a0b5054ddd968cf1')throw Error('Gallery still contains the obsolete command-catalog capture');await mkdir(path.join(out,'images'),{recursive:true});await copyFile(asset,path.join(out,'images',path.basename(item.file)))}
await writeFile(path.join(out,'documentation.json'),JSON.stringify({schemaVersion:1,version:pkg.version,sourceCommit:commit,updatedAt,articles,wiki},null,2));
await writeFile(path.join(out,'gallery.json'),JSON.stringify(gallery,null,2));
await writeFile(path.join(out,'.nojekyll'),'');
const outputFiles=[];
async function outputManifest(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())await outputManifest(file);else{const bytes=await readFile(file);outputFiles.push({file:path.relative(out,file).split(path.sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
await outputManifest(out);outputFiles.sort((a,b)=>a.file.localeCompare(b.file));
const manifest=JSON.stringify({schemaVersion:1,files:outputFiles},null,2);await writeFile(path.join(out,'asset-manifest.json'),manifest);
const sourceFiles=execFileSync('git',['ls-files','--','site','src/site-shared','src/shared','src/renderer/localization.ts','docs','scripts/build-site.mjs','assets/icon.svg','assets/icon.png','package.json','package-lock.json'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const inputs=await Promise.all(sourceFiles.map(async file=>({file,sha256:createHash('sha256').update(await readFile(path.join(root,file))).digest('hex')})));
await writeFile(path.join(out,'build-receipt.json'),JSON.stringify({schemaVersion:1,sourceCommit:commit,dirty,siteUrl:'https://ding-ding-projects.github.io/material-git/',artifactManifestSha256:createHash('sha256').update(manifest).digest('hex'),articleCount:articles.length,wikiStatus:wiki.status,currentCaptureSource:currentSourceCommit,currentCaptureCount:currentCaptures.length,historicalCaptureCount:gallery.captures.length-currentCaptures.length,inputs},null,2));
console.log(`Built Material Git website ${pkg.version}, ${articles.length} bundled articles, ${gallery.captures.length} reviewed captures (${commit||'source unavailable'})`);
