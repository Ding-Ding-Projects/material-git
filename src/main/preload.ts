import {contextBridge,ipcRenderer} from 'electron';
import type {MaterialBridge,Operation} from '../shared/types';
const api:MaterialBridge={
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
