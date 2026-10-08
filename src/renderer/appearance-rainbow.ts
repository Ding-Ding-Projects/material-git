import{rainbowCss,rainbowDuration}from'../shared/appearance-rainbow.js';
const key='material-git.appearance-rainbow.v1';
export function rainbowSpeed():number{try{const raw=localStorage.getItem(key);if(raw===null)return 3;const level=JSON.parse(raw);rainbowDuration(level);return level;}catch{return 3;}}
export function restoreRainbow():void{let style=document.getElementById('mg-rainbow-style');if(!style){style=document.createElement('style');style.id='mg-rainbow-style';style.textContent=rainbowCss;document.head.append(style);}document.documentElement.style.setProperty('--mg-rainbow-duration',`${rainbowDuration(rainbowSpeed())}s`);}
export function setRainbowSpeed(level:number):void{rainbowDuration(level);localStorage.setItem(key,JSON.stringify(level));restoreRainbow();window.dispatchEvent(new CustomEvent('appearance-rainbow-change',{detail:{schemaVersion:1,level}}));}
