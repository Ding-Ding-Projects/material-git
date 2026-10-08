import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
export async function documentationInventory(root='docs') {
 const result=[];
 async function walk(directory){for(const file of await readdir(directory,{withFileTypes:true})){const filename=path.join(directory,file.name);if(file.isDirectory())await walk(filename);else if(file.name.endsWith('.md')){const body=await readFile(filename,'utf8');result.push({id:path.relative(root,filename).replaceAll('\\','/'),title:body.match(/^#\s+(.+)$/m)?.[1]||file.name});}}}
 await walk(root);return result.sort((a,b)=>a.id.localeCompare(b.id));
}
export async function verifyDocumentationBundle(dist='dist/renderer',source='docs') {
 const inventory=await documentationInventory(source),files=await readdir(path.join(dist,'assets'));const bundle=(await Promise.all(files.filter(f=>f.endsWith('.js')).map(f=>readFile(path.join(dist,'assets',f),'utf8')))).join('\n');
 const missing=inventory.filter(article=>!bundle.includes(article.id)||!bundle.includes(article.title));if(missing.length)throw Error(`Offline documentation bundle is missing articles: ${missing.map(a=>a.id).join(', ')}`);
 await mkdir(dist,{recursive:true});await writeFile(path.join(dist,'documentation-inventory.json'),JSON.stringify({version:1,count:inventory.length,articles:inventory},null,2));return inventory;
}
