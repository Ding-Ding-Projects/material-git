import {build} from 'esbuild';
import {mkdir,copyFile,readFile,readdir,rm,stat,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {marked} from 'marked';
import {validateDocumentationBundle} from '../src/site-shared/build-contract.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const out=path.join(root,'site/dist');
async function walk(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const next=path.join(dir,entry.name);if(entry.isDirectory())files.push(...await walk(next));else if(entry.name.endsWith('.md'))files.push(next)}return files.sort()}
const articles=await Promise.all((await walk(path.join(root,'docs'))).map(async file=>{const source=path.relative(root,file).split(path.sep).join('/'),body=await readFile(file,'utf8'),title=body.match(/^#\s+(.+)$/m)?.[1]??path.basename(file,'.md');return {id:source.slice(5,-3),title,source,body,html:marked.parse(body)}}));
validateDocumentationBundle((await walk(path.join(root,'docs'))).map(file=>path.relative(root,file).split(path.sep).join('/')),articles);
const gallery=JSON.parse(await readFile(path.join(root,'site/gallery.json'),'utf8'));
if(gallery.schemaVersion!==1||!Array.isArray(gallery.captures))throw Error('Invalid gallery manifest');
let commit='',updatedAt='',dirty=false;try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();updatedAt=execFileSync('git',['show','-s','--format=%cI',commit],{cwd:root,encoding:'utf8'}).trim();dirty=Boolean(execFileSync('git',['status','--porcelain','--untracked-files=no','--','site','src/site-shared','docs','scripts/build-site.mjs','package.json','assets'],{cwd:root,encoding:'utf8'}).trim());if(dirty)updatedAt=''}catch{}
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const define={__SITE_DIRTY__:JSON.stringify(dirty),__SITE_VERSION__:JSON.stringify(pkg.version),__SITE_COMMIT__:JSON.stringify(commit),__SITE_UPDATED_AT__:JSON.stringify(updatedAt),__SITE_DOCS__:JSON.stringify(articles),__SITE_GALLERY__:JSON.stringify(gallery.captures)};
await build({entryPoints:[path.join(root,'site/app.ts')],outfile:path.join(out,'app.js'),bundle:true,format:'esm',target:'es2022',minify:true,define});
await build({entryPoints:[path.join(root,'site/regex-worker.ts')],outfile:path.join(out,'regex-worker.js'),bundle:true,format:'esm',target:'es2022',minify:true});
await Promise.all(['index.html','style.css'].map(file=>copyFile(path.join(root,'site',file),path.join(out,file))));
await Promise.all(['icon.svg','icon.png'].map(file=>copyFile(path.join(root,'assets',file),path.join(out,file))));
for(const item of gallery.captures){if(!/^docs\/images\/[a-z0-9][a-z0-9._-]*\.(png|webp|jpg)$/.test(item.file)||!(/^[a-f0-9]{40}$/.test(item.sourceCommit))||!Number.isFinite(Date.parse(item.capturedAt)))throw Error('Gallery requires reviewed local images and capture provenance');const asset=path.join(root,item.file);if(!(await stat(asset)).isFile())throw Error('Gallery capture is missing');await mkdir(path.join(out,'images'),{recursive:true});await copyFile(asset,path.join(out,'images',path.basename(item.file)))}
await writeFile(path.join(out,'documentation.json'),JSON.stringify({schemaVersion:1,version:pkg.version,sourceCommit:commit,updatedAt,articles},null,2));
console.log(`Built Material Git website ${pkg.version}, ${articles.length} bundled articles, ${gallery.captures.length} reviewed captures (${commit||'source unavailable'})`);
