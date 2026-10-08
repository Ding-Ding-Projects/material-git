import {contextBridge,ipcRenderer} from 'electron';
import type {MaterialBridge,Operation} from '../shared/types';
const api:MaterialBridge={
 exportAppearance:payload=>ipcRenderer.invoke('material:appearance-export',payload),
 downloads:request=>ipcRenderer.invoke('material:downloads',request),
 onDownload:callback=>{const listener=(_event:unknown,job:Parameters<typeof callback>[0])=>callback(job);ipcRenderer.on('material:download-update',listener);return()=>ipcRenderer.removeListener('material:download-update',listener);},
 startupPersonalization:()=>ipcRenderer.invoke('material:startup-personalization'),
 git:(action,payload)=>ipcRenderer.invoke('material:git',action,payload),
 github:(action,payload)=>ipcRenderer.invoke('material:github',action,payload),
 workspace:(action,payload)=>ipcRenderer.invoke('material:workspace',action,payload),
 cliWorkflows:(action,payload)=>ipcRenderer.invoke('material:cli-workflows',action,payload),
 localTools:(action,payload)=>ipcRenderer.invoke('material:local-tools',action,payload),
 preferencesAdvanced:(action,payload)=>ipcRenderer.invoke('material:preferences-advanced',action,payload),
 onPreferencesAdvanced:callback=>{const listener=(_event:unknown,status:Parameters<typeof callback>[0])=>callback(status);ipcRenderer.on('material:preferences-advanced-update',listener);return()=>ipcRenderer.removeListener('material:preferences-advanced-update',listener);},
 api:(action,payload)=>ipcRenderer.invoke('material:api',action,payload),
 cliConfig:(action,payload)=>ipcRenderer.invoke('material:cli-config',action,payload),
 onCloseRequested:callback=>{const listener=()=>callback();ipcRenderer.on('material:close-request',listener);return()=>ipcRenderer.removeListener('material:close-request',listener);},
 security:(action,payload)=>ipcRenderer.invoke('material:security',action,payload),
 onSecurity:callback=>{const listener=(_event:unknown,state:Parameters<typeof callback>[0])=>callback(state);ipcRenderer.on('material:security-update',listener);return()=>ipcRenderer.removeListener('material:security-update',listener);},
 auth:(action,payload)=>ipcRenderer.invoke('material:auth',action,payload),
 onAuth:callback=>{const listener=(_event:unknown,state:Parameters<typeof callback>[0])=>callback(state);ipcRenderer.on('material:auth-update',listener);return()=>ipcRenderer.removeListener('material:auth-update',listener);},
 updates:action=>ipcRenderer.invoke('material:updates',action),
 onUpdate:callback=>{const listener=(_event:unknown,state:Parameters<typeof callback>[0])=>callback(state);ipcRenderer.on('material:update-state',listener);return()=>ipcRenderer.removeListener('material:update-state',listener);},
 bootstrap:()=>ipcRenderer.invoke('material:bootstrap'),execute:r=>ipcRenderer.invoke('material:execute',r),cancel:id=>ipcRenderer.invoke('material:cancel',id),operation:id=>ipcRenderer.invoke('material:operation',id),
 choices:(entity,context)=>ipcRenderer.invoke('material:choices',entity,context),pick:(kind,options)=>ipcRenderer.invoke('material:pick',kind,options),settings:patch=>ipcRenderer.invoke('material:settings',patch),history:()=>ipcRenderer.invoke('material:history'),
 exportData:(data,format)=>ipcRenderer.invoke('material:export',data,format),vocabulary:action=>ipcRenderer.invoke('material:vocabulary',action),openExternal:url=>ipcRenderer.invoke('material:external',url),window:action=>ipcRenderer.invoke('material:window',action),ollama:(action,payload)=>ipcRenderer.invoke('material:ollama',action,payload),
 onOperation:callback=>{const listener=(_event:unknown,operation:Operation)=>callback(operation);ipcRenderer.on('material:operation-update',listener);return()=>ipcRenderer.removeListener('material:operation-update',listener);}
};
contextBridge.exposeInMainWorld('material',api);
