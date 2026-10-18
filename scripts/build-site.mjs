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
if(!wiki||wiki.schemaVersion!==1||!['available','unavailable'].includes(wiki.status)||wiki.source!=='https://github.com/Ding-Ding-Projects/material-git/wiki'||!Array.isArray(wiki.articles))throw Error('Wiki source manifest is invalid');
const wikiRoot=path.join(root,'site/wiki'),wikiArticles=[],wikiSources=[];
if(wiki.status==='unavailable'){
 if(wiki.sourceCommit!==null||wiki.articles.length)throw Error('Unavailable wiki manifest must not claim source content');
 try{if((await walk(wikiRoot)).length)throw Error('Wiki files exist without an available source manifest')}catch(error){if(error.code!=='ENOENT')throw error}
}else{
 if(typeof wiki.sourceCommit!=='string'||wiki.sourceCommit.length!==40||![...wiki.sourceCommit].every(c=>'0123456789abcdef'.includes(c))||!wiki.articles.length)throw Error('Available wiki requires an exact source commit and complete page list');
 const diskFiles=(await walk(wikiRoot)).map(file=>path.relative(wikiRoot,file).split(path.sep).join('/')).sort(),listed=wiki.articles.map(page=>page&&page.file).sort();
 if(listed.some(file=>typeof file!=='string'||!file.endsWith('.md')||file.startsWith('/')||file.includes(String.fromCharCode(92))||file.split('/').some(part=>!part||part==='.'||part==='..'))||new Set(listed).size!==listed.length||JSON.stringify(diskFiles)!==JSON.stringify(listed))throw Error('Wiki manifest must enumerate every Markdown page exactly once');
 const wikiSourceSet=new Set([...documentSources,...listed.map(file=>'wiki/'+file)]);
 const ids=new Set(articles.map(article=>article.id));
 for(const page of wiki.articles){
  const source='wiki/'+page.file,body=await readFile(path.join(wikiRoot,...page.file.split('/')),'utf8'),lower=body.toLowerCase(),slash=String.fromCharCode(92);
  if(lower.includes('.chatgpt.site')||body.includes('/workspace/')||body.includes('/home/')||lower.includes('c:'+slash+'users'+slash))throw Error('Public wiki page contains a private address or machine path: '+source);
  const id=source.slice(0,-3),title=typeof page.title==='string'&&page.title.trim()?page.title.trim():path.posix.basename(page.file,'.md').replaceAll('-',' '),sourcePage=page.file.slice(0,-3).replaceAll('/','-').replaceAll(' ','-');
  if(ids.has(id))throw Error('Wiki page identity collides with existing documentation');
  ids.add(id);wikiSources.push(source);
  wikiArticles.push({id,title,category:'Wiki',source,sourceUrl:repository+'/wiki/'+encodeURIComponent(sourcePage),body,html:renderArticle(body,source,wikiSourceSet)});
 }
}
const allSources=new Set([...documentSources,...wikiSources]);
const completeArticles=[...articles.map(article=>({...article,html:renderArticle(article.body,article.source,allSources)})),...wikiArticles];
validateDocumentationBundle([...documentSources,...wikiSources],completeArticles);
if(process.argv.includes('--require-reviewed-current')&&wiki.status!=='available')throw Error('Public deployment requires the complete wiki snapshot in the local documentation bundle');
let commit='',updatedAt='',dirty=false;try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();updatedAt=execFileSync('git',['show','-s','--format=%cI',commit],{cwd:root,encoding:'utf8'}).trim();dirty=Boolean(execFileSync('git',['status','--porcelain','--untracked-files=no','--','site','src/site-shared','src/shared','docs','scripts/build-site.mjs','package.json','assets'],{cwd:root,encoding:'utf8'}).trim());if(dirty)updatedAt=''}catch{}
let hostingPresent=false;try{hostingPresent=(await stat(path.join(root,'.openai/hosting.json'))).isFile()}catch(error){if(error.code!=='ENOENT')throw error}
if(hostingPresent){let record;try{record=JSON.parse(await readFile(path.join(root,'.openai/upstream-source.json'),'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}const upstream=validateUpstreamSource(record,true);if(upstream){commit=upstream.commit;updatedAt=upstream.updatedAt;dirty=false}}
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
if(process.argv.includes('--require-reviewed-current')&&dirty)throw Error('Public deployment requires clean reviewed website inputs');
const define={__SITE_DIRTY__:JSON.stringify(dirty),__SITE_VERSION__:JSON.stringify(pkg.version),__SITE_COMMIT__:JSON.stringify(commit),__SITE_UPDATED_AT__:JSON.stringify(updatedAt),__SITE_DOCS__:JSON.stringify(completeArticles),__SITE_GALLERY__:JSON.stringify(gallery.captures),__SITE_CURRENT_CAPTURE_SOURCE__:JSON.stringify(currentSourceCommit??''),__SITE_WIKI_STATUS__:JSON.stringify(wiki.status)};
await build({entryPoints:[path.join(root,'site/app.ts')],outfile:path.join(out,'app.js'),bundle:true,format:'esm',target:'es2022',minify:true,define});
await build({entryPoints:[path.join(root,'site/regex-worker.ts')],outfile:path.join(out,'regex-worker.js'),bundle:true,format:'esm',target:'es2022',minify:true});
await Promise.all(['index.html','style.css'].map(file=>copyFile(path.join(root,'site',file),path.join(out,file))));
await Promise.all(['icon.svg','icon.png'].map(file=>copyFile(path.join(root,'assets',file),path.join(out,file))));
const captureReceipts=JSON.parse(await readFile(path.join(root,'docs/images/captures.json'),'utf8'));
for(const item of gallery.captures){if(!/^docs\/images\/[a-z0-9][a-z0-9._-]*\.(png|webp|jpg)$/.test(item.file)||!(/^[a-f0-9]{40}$/.test(item.sourceCommit))||!Number.isFinite(Date.parse(item.capturedAt)))throw Error('Gallery requires reviewed local images and capture provenance');const asset=path.join(root,item.file);if(!(await stat(asset)).isFile())throw Error('Gallery capture is missing');const bytes=await readFile(asset),hash=createHash('sha256').update(bytes).digest('hex'),records=captureReceipts.captures.filter(record=>record.file===item.file);if(records.length!==1||records[0].sha256!==hash||records[0].sourceCommit!==item.sourceCommit||records[0].capturedAt!==item.capturedAt)throw Error('Gallery capture does not match its source receipt');if(hash==='b22f56f57c30103622e3cd4ac5a106a50335964760f5bf64a0b5054ddd968cf1')throw Error('Gallery still contains the obsolete command-catalog capture');await mkdir(path.join(out,'images'),{recursive:true});await copyFile(asset,path.join(out,'images',path.basename(item.file)))}
await writeFile(path.join(out,'documentation.json'),JSON.stringify({schemaVersion:1,version:pkg.version,sourceCommit:commit,updatedAt,articles:completeArticles,wiki:{...wiki,articles:wikiArticles}},null,2));
await writeFile(path.join(out,'gallery.json'),JSON.stringify(gallery,null,2));
await writeFile(path.join(out,'.nojekyll'),'');
const outputFiles=[];
async function outputManifest(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())await outputManifest(file);else{const bytes=await readFile(file);outputFiles.push({file:path.relative(out,file).split(path.sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
await outputManifest(out);outputFiles.sort((a,b)=>a.file.localeCompare(b.file));
const manifest=JSON.stringify({schemaVersion:1,files:outputFiles},null,2);await writeFile(path.join(out,'asset-manifest.json'),manifest);
const sourceFiles=execFileSync('git',['ls-files','--','site','src/site-shared','src/shared','src/renderer/localization.ts','docs','scripts/build-site.mjs','assets/icon.svg','assets/icon.png','package.json','package-lock.json'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const inputs=await Promise.all(sourceFiles.map(async file=>({file,sha256:createHash('sha256').update(await readFile(path.join(root,file))).digest('hex')})));
await writeFile(path.join(out,'build-receipt.json'),JSON.stringify({schemaVersion:1,sourceCommit:commit,dirty,siteUrl:'https://ding-ding-projects.github.io/material-git/',artifactManifestSha256:createHash('sha256').update(manifest).digest('hex'),articleCount:completeArticles.length,wikiStatus:wiki.status,currentCaptureSource:currentSourceCommit,currentCaptureCount:currentCaptures.length,historicalCaptureCount:gallery.captures.length-currentCaptures.length,inputs},null,2));
console.log("Built Material Git website "+pkg.version+", "+articles.length+" documentation articles, "+wikiArticles.length+" wiki pages, "+gallery.captures.length+" reviewed captures ("+(commit||"source unavailable")+").");
