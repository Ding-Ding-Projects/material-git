import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/main/catalog';
test('pinned official catalog is unique, structured and contains modern command groups',()=>{
 const catalog=loadCatalog();assert.equal(catalog.version,'2.102.0');assert.ok(catalog.commands.length===196);
 assert.equal(new Set(catalog.commands.map(c=>c.id)).size,catalog.commands.length);
 for(const group of ['pr','issue','repo','discussion','agent-task','skill','project','attestation'])assert.ok(catalog.commands.some(c=>c.group===group),group);
 for(const c of catalog.commands){assert.equal(c.id,c.path.join(' '));assert.ok(c.usage);for(const o of c.options)if(o.type==='choice')assert.ok(o.choices?.length);}
 assert.ok(catalog.commands.find(c=>c.id==='pr list')?.options.find(o=>o.name==='state')?.choices?.includes('merged'));
});
test('noninteractive coverage and guided metadata match command semantics',()=>{
 const commands=loadCatalog().commands;const get=(id:string)=>commands.find(c=>c.id===id)!;
 for(const id of ['alias list','extension list','extension search','skill list','skill search','skill preview','run watch','pr create','pr revert','pr checkout','repo clone','repo sync','gist clone','issue develop','browse'])assert.notEqual(get(id).interactive,true,id);
 for(const command of commands)for(const argument of command.arguments)assert.match(argument.name,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
 assert.equal(get('pr view').arguments.length,1);assert.equal(get('pr view').arguments[0].entity,'pull-request');
 assert.equal(get('skill install').arguments[1].name,'skill');
 assert.equal(get('issue create').options.find(o=>o.name==='title')?.required,true);
 assert.equal(get('pr create').options.find(o=>o.name==='body')?.required,true);
 assert.deepEqual(get('completion').arguments[0].choices,['bash','zsh','fish','powershell']);
 assert.equal(commands.filter(c=>!c.interactive).length,181);
});
