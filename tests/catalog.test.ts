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
 assert.deepEqual(get('completion').options.find(o=>o.name==='shell')?.choices,['bash','zsh','fish','powershell']);
 assert.equal(commands.filter(c=>!c.interactive).length,181);
});
test('native placeholders, option alternatives, templates and defaults retain their actual types',()=>{
 const commands=loadCatalog().commands;const get=(id:string)=>commands.find(c=>c.id===id)!;const option=(id:string,name:string)=>get(id).options.find(o=>o.name===name)!;
 for(const id of ['gist create','release create']){const files=get(id).arguments.find(a=>a.name==='filename-pattern')!;assert.equal(files.type,'file');assert.equal(files.multiple,true);assert.equal(files.choices,undefined);}
 assert.equal(get('gist create').arguments[0].required,true);assert.equal(get('release create').arguments[0].required,true);
 for(const id of ['attestation download','attestation verify']){assert.equal(get(id).arguments.length,1);assert.equal(get(id).arguments[0].required,true);assert.equal(get(id).arguments[0].choices,undefined);}
 assert.equal(get('attestation trusted-root').arguments.length,0);assert.equal(get('completion').arguments.length,0);assert.equal(option('completion','shell').required,true);
 assert.equal(get('alias delete').arguments[0].name,'alias');assert.equal(get('alias delete').arguments[0].required,false);
 assert.equal(get('codespace cp').arguments.length,2);assert.deepEqual(get('codespace ports visibility').arguments.map(a=>a.name),['port-visibility']);assert.equal(get('issue edit').arguments[0].multiple,true);
 assert.equal(option('api','template').type,'multiline');assert.equal(option('issue create','template').type,'text');assert.equal(option('pr create','template').type,'file');assert.equal(option('repo create','template').entity,'repository');assert.equal(option('repo edit','template').type,'boolean');
 assert.deepEqual(option('repo edit','visibility').choices,['public','private','internal']);assert.equal(option('attestation verify','format').choices?.[0],'json');
 assert.equal(option('gist create','filename').type,'text');assert.equal(option('codespace cp','profile').type,'text');assert.equal(option('search code','filename').type,'text');assert.equal(get('repo read-file').arguments[0].type,'text');
 for(const command of commands)for(const o of command.options){if(o.default===undefined)continue;if(o.type==='boolean')assert.equal(typeof o.default,'boolean',`${command.id} --${o.name}`);if(o.type==='number')assert.ok(typeof o.default==='number'&&Number.isFinite(o.default));if(typeof o.default==='string')assert.ok(!o.default.startsWith('['));}
 assert.equal(option('gist create','public').default,undefined);assert.equal(option('release create','latest').default,undefined);assert.equal(option('ruleset list','parents').default,true);assert.equal(option('api','method').default,undefined);assert.notEqual(option('project item-edit','field').multiple,true);assert.equal(get('project item-edit').arguments[0].required,false);assert.equal(get('run view').arguments[0].required,false);
});
