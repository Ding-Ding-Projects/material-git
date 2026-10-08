/** Renderer requests identify provider records, never URLs or local paths. */
export interface DownloadSelection {kind:'release-asset'|'artifact';hostname:string;repository:string;id:string}
export type DownloadState='queued'|'downloading'|'paused'|'cancelled'|'failed'|'completed';
export type DownloadIssue='authentication'|'source-changed'|'destination-exists'|'transfer'|'integrity'|'storage'|'interrupted';
export interface DownloadJob {
 id:string;selection:DownloadSelection;name:string;destination:string;state:DownloadState;
 bytes:number;total:number|null;bytesPerSecond:number;etaSeconds:number|null;
 resumable:boolean;issue?:DownloadIssue;verification?:'sha256'|'length';updatedAt:string;
}
export interface DownloadPage {items:DownloadJob[];page:number;hasNext:boolean;total:number;recovery:'durable'|'session'}
export type DownloadRequest={action:'list';page?:number}|{action:'enqueue';selection:DownloadSelection}|{action:'pause'|'cancel'|'resume'|'retry'|'remove';id:string};
export interface DownloadClient {handle(request:DownloadRequest):Promise<DownloadPage>;subscribe(listener:(job:DownloadJob)=>void):()=>void}
export const DOWNLOAD_PAGE_SIZE=20;
export function validateDownloadSelection(value:unknown):DownloadSelection {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Choose a GitHub asset or artifact.');
 const row=value as Record<string,unknown>;
 if(Object.keys(row).some(key=>!['kind','hostname','repository','id'].includes(key))||!['release-asset','artifact'].includes(String(row.kind))||typeof row.hostname!=='string'||!/^([A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?)$/.test(row.hostname)||typeof row.repository!=='string'||row.repository.length>200||! /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(row.repository)||typeof row.id!=='string'||! /^[1-9][0-9]{0,15}$/.test(row.id))throw new Error('Choose a valid GitHub asset or artifact.');
 return {kind:row.kind as DownloadSelection['kind'],hostname:row.hostname.toLowerCase(),repository:row.repository,id:row.id};
}
