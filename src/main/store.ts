import {mkdirSync,writeFileSync,renameSync,existsSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {readBoundedFile} from './bounded-file';
import {randomUUID} from 'node:crypto';
import {defaults,validateSettings} from '../shared/preferences';
import {parseVocabulary,type Vocabulary} from '../shared/vocabulary';
import type {AppSettings,HistoryEntry} from '../shared/types';

export class LocalStore {
 constructor(private directory:string) { mkdirSync(directory,{recursive:true,mode:0o700}); }
 private file(name:string){return path.join(this.directory,name+'.json');}
 private read(name:string):unknown {try{return JSON.parse(readBoundedFile(this.file(name),name==='history'?2097152:65536).toString('utf8'));}catch{return null;}}
 private write(name:string,value:unknown){const file=this.file(name),temporary=file+'.tmp';writeFileSync(temporary,JSON.stringify(value),{mode:0o600});renameSync(temporary,file);}
 settings():AppSettings {try{return {...defaults,...validateSettings(this.read('settings')??{})};}catch{return {...defaults};}}
 persistedSettingsKeys():string[]{try{return Object.keys(validateSettings(this.read('settings')??{}));}catch{return [];}}
 update(patch:unknown):AppSettings {const valid=validateSettings(patch),settings={...this.settings(),...valid};this.write('settings',settings);this.record('Settings updated',settings);return settings;}
 history():HistoryEntry[]{const rows=this.read('history');return Array.isArray(rows)?rows.filter(v=>v&&typeof v.id==='string'&&typeof v.action==='string').slice(-500):[];}
 record(action:string,snapshot?:AppSettings){const entries=this.history();entries.push({id:randomUUID(),at:new Date().toISOString(),action,...(snapshot?{snapshot}:{})});this.write('history',entries.slice(-500));}
 vocabulary():Vocabulary|null {try{if(!existsSync(this.file('vocabulary')))return null;return parseVocabulary(readBoundedFile(this.file('vocabulary'),65536));}catch{return null;}}
 setVocabulary(bytes:Uint8Array){const data=parseVocabulary(bytes);this.write('vocabulary',data);return data;}
 clearVocabulary(){if(existsSync(this.file('vocabulary')))unlinkSync(this.file('vocabulary'));}
}
