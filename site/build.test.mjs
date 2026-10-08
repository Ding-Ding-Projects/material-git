import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {validateDocumentationBundle} from '../src/site-shared/build-contract.mjs';
const root=new URL('../',import.meta.url);
async function markdown(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())files.push(...await markdown(file));else if(entry.name.endsWith('.md'))files.push(file)}return files}
const sources=(await markdown(new URL('../docs',import.meta.url).pathname)).map(file=>'docs/'+path.relative(new URL('../docs',import.meta.url).pathname,file).split(path.sep).join('/'));
const bundle=JSON.parse(await readFile(new URL('./dist/documentation.json',import.meta.url),'utf8'));
test('every source article appears exactly once with its body and rendered markup',()=>assert.equal(validateDocumentationBundle(sources,bundle.articles),true));
test('negative regressions reject a removed article and each removed exact boundary',()=>{for(let i=0;i<bundle.articles.length;i++){assert.throws(()=>validateDocumentationBundle(sources,bundle.articles.filter((_,index)=>index!==i)));for(const key of ['id','source','title','body','html']){const changed=structuredClone(bundle.articles);delete changed[i][key];assert.throws(()=>validateDocumentationBundle(sources,changed),key)}}assert.equal(validateDocumentationBundle(sources,bundle.articles),true)});
test('no old screenshot or external asset is shipped from the website shell',async()=>{const html=await readFile(new URL('./dist/index.html',import.meta.url),'utf8'),css=await readFile(new URL('./dist/style.css',import.meta.url),'utf8');assert.doesNotMatch(html,/<(?:script|link)[^>]*(?:src|href)=["']https?:/);assert.doesNotMatch(css,/@import|https?:\/\//);assert.doesNotMatch(css,/fonts\.googleapis/);const gallery=JSON.parse(await readFile(new URL('./gallery.json',import.meta.url),'utf8'));assert.equal(gallery.schemaVersion,1);assert.ok(!gallery.captures.some(c=>c.file==='docs/images/desktop.png'))});
