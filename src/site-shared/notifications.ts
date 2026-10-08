import type {MessageCategory,MessageFacts} from '../renderer/localization';
export const notificationCategories:MessageCategory[]=['status','progress','warning','error','destructive','financial','security','accessibility'];
export const notificationKey='material-git-site.notifications.v1';
export const notificationLimit=200;
export const notificationBytes=1_048_576;
export const notificationActions=['latest-release','release-notes','preferences','schedule','appearance','vocabulary','transfer','school','history','logo','reset'] as const;
export type NotificationAction=typeof notificationActions[number];
export interface SiteNotification extends MessageFacts {id:string;at:string;category:MessageCategory;dismissed:boolean;action?:NotificationAction}
export interface NotificationDocument {schemaVersion:1;revision:number;records:SiteNotification[]}
export function emptyNotifications():NotificationDocument{return {schemaVersion:1,revision:0,records:[]}}
export function validateNotifications(value:unknown):NotificationDocument {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid notification document');
 const doc=value as NotificationDocument;
 if(Object.keys(doc).some(key=>!['schemaVersion','revision','records'].includes(key))||doc.schemaVersion!==1||!Number.isSafeInteger(doc.revision)||doc.revision<0||!Array.isArray(doc.records)||doc.records.length>notificationLimit)throw Error('Invalid notification document');
 const ids=new Set<string>();
 const records=doc.records.map(record=>{
  if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).some(key=>!['id','at','category','en','yue','dismissed','action'].includes(key))||typeof record.id!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(record.id)||ids.has(record.id)||typeof record.at!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(record.at)||!Number.isFinite(Date.parse(record.at))||!notificationCategories.includes(record.category)||typeof record.dismissed!=='boolean'||['en','yue'].some(key=>typeof record[key as 'en'|'yue']!=='string'||!record[key as 'en'|'yue'].length||record[key as 'en'|'yue'].length>4000)||record.action!==undefined&&!notificationActions.includes(record.action))throw Error('Invalid notification record');
  ids.add(record.id);return {...record};
 });
 const result={schemaVersion:1 as const,revision:doc.revision,records};
 if(new TextEncoder().encode(JSON.stringify(result)).byteLength>notificationBytes)throw Error('Notification storage exceeds 1 MiB');
 return result;
}
export function addNotification(document:NotificationDocument,record:SiteNotification):NotificationDocument {
 validateNotifications({schemaVersion:1,revision:0,records:[record]});
 if(document.records.some(value=>value.id===record.id))throw Error('Duplicate notification identifier');
 const records=[...document.records,record];
 while(records.length>notificationLimit||new TextEncoder().encode(JSON.stringify({schemaVersion:1,revision:document.revision+1,records})).byteLength>notificationBytes){const disposable=records.findIndex(value=>value.id!==record.id&&(value.dismissed||!['warning','error'].includes(value.category)));if(disposable<0)throw Error('Notification storage is full. Export records or dismiss an older message before retrying.');records.splice(disposable,1)}
 return validateNotifications({schemaVersion:1,revision:document.revision+1,records});
}
export function changeNotifications(document:NotificationDocument,revision:number,ids:string[],dismissed:boolean):{document:NotificationDocument;changed:number;skipped:number} {
 if(document.revision!==revision)throw Error('Notification review is outdated. Review the current records again.');
 const selected=new Set(ids);
 let changed=0;const records=document.records.map(record=>{if(!selected.has(record.id)||record.dismissed===dismissed)return record;changed++;return {...record,dismissed}});
 return {document:validateNotifications({schemaVersion:1,revision:document.revision+(changed?1:0),records}),changed,skipped:ids.length-changed};
}
export function notificationSearchText(record:SiteNotification):string{return `${record.category} ${record.at} ${record.en} ${record.yue}`}
export function visibleNotificationStack(document:NotificationDocument,now=Date.now(),quiet=false):SiteNotification[]{return document.records.filter(record=>!record.dismissed&&(['error','warning'].includes(record.category)||!quiet&&now-Date.parse(record.at)<8000)).slice(-3)}
