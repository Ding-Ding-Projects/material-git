import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateDocumentationBundle} from '../src/site-shared/build-contract.mjs';
const root=new URL('../',import.meta.url);
async function markdown(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())files.push(...await markdown(file));else if(entry.name.endsWith('.md'))files.push(file)}return files}
const sources=(await markdown(new URL('../docs',import.meta.url).pathname)).map(file=>'docs/'+path.relative(new URL('../docs',import.meta.url).pathname,file).split(path.sep).join('/'));
const bundle=JSON.parse(await readFile(new URL('./dist/documentation.json',import.meta.url),'utf8'));
test('every source article appears exactly once with its body and rendered markup',()=>assert.equal(validateDocumentationBundle(sources,bundle.articles),true));
test('negative regressions reject a removed article and each removed exact boundary',()=>{for(let i=0;i<bundle.articles.length;i++){assert.throws(()=>validateDocumentationBundle(sources,bundle.articles.filter((_,index)=>index!==i)));for(const key of ['id','source','title','body','html']){const changed=structuredClone(bundle.articles);delete changed[i][key];assert.throws(()=>validateDocumentationBundle(sources,changed),key)}}assert.equal(validateDocumentationBundle(sources,bundle.articles),true)});
test('no old screenshot or external asset is shipped from the website shell',async()=>{const html=await readFile(new URL('./dist/index.html',import.meta.url),'utf8'),css=await readFile(new URL('./dist/style.css',import.meta.url),'utf8');assert.doesNotMatch(html,/<(?:script|link)[^>]*(?:src|href)=["']https?:/);assert.doesNotMatch(css,/@import|https?:\/\//);assert.doesNotMatch(css,/fonts\.googleapis/);const gallery=JSON.parse(await readFile(new URL('./gallery.json',import.meta.url),'utf8'));assert.equal(gallery.schemaVersion,1);for(const capture of gallery.captures){const bytes=await readFile(new URL('./dist/images/'+path.basename(capture.file),import.meta.url));const sourceBytes=await readFile(new URL('../'+capture.file,import.meta.url));assert.deepEqual(bytes,sourceBytes,'published capture must preserve the reviewed source bytes');assert.notEqual(createHash('sha256').update(bytes).digest('hex'),'b22f56f57c30103622e3cd4ac5a106a50335964760f5bf64a0b5054ddd968cf1','obsolete screenshot bytes cannot be published')}});

test('each gallery image agrees with its capture receipt source, time, hash and dimensions',async()=>{
 const gallery=JSON.parse(await readFile(new URL('./gallery.json',import.meta.url),'utf8'));
 const receipt=JSON.parse(await readFile(new URL('../docs/images/captures.json',import.meta.url),'utf8'));
 assert.equal(receipt.schemaVersion,1);assert.equal(receipt.captures.length,gallery.captures.length);
 assert.equal(new Set(receipt.captures.map(item=>item.file)).size,receipt.captures.length,'receipt filenames are unique');
 for(const capture of gallery.captures){const records=receipt.captures.filter(item=>item.file===capture.file);assert.equal(records.length,1,capture.file);const record=records[0],bytes=await readFile(new URL('../'+capture.file,import.meta.url));assert.equal(record.sourceCommit,capture.sourceCommit);assert.equal(record.capturedAt,capture.capturedAt);assert.equal(record.timezone,'UTC');assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);assert.equal(bytes.readUInt32BE(16),record.width);assert.equal(bytes.readUInt32BE(20),record.height)}
});
