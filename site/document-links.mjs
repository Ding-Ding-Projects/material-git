import path from 'node:path';
import {Marked} from 'marked';

const repository='https://github.com/Ding-Ding-Projects/material-git';
function articleId(source){return source.startsWith('docs/')?source.slice(5,-3):source.slice(0,-3)}
export function documentationRoute(source,section=''){
 return '#docs/'+encodeURIComponent(articleId(source))+(section?'?section='+encodeURIComponent(section):'');
}
export function renderArticle(body,source,sources){
 const ids=new Map();
 const renderer={
  heading({tokens,depth}){
   const content=this.parser.parseInline(tokens),base=content.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').trim().replace(/\s/g,'-');
   const count=ids.get(base)||0;ids.set(base,count+1);const id=base+(count?'-'+count:'');
   return `<h${depth} id="${id}" tabindex="-1">${content}</h${depth}>\n`;
  },
  link(token){
   let href=token.href;
   if(href.startsWith('#'))href=documentationRoute(source,decodeURIComponent(href.slice(1)));
   else{
    let local;
    if(!/^[a-z][a-z0-9+.-]*:/i.test(href)&&!href.startsWith('//'))local=new URL(href,'https://documentation.invalid/'+source);
    else if(href.startsWith(repository+'/blob/main/docs/'))local=new URL(href.slice((repository+'/blob/main').length),'https://documentation.invalid');
    if(local){const target=decodeURIComponent(local.pathname.slice(1));href=sources.has(target)?documentationRoute(target,decodeURIComponent(local.hash.slice(1))):repository+'/blob/main/'+path.posix.normalize(target)+local.hash;}
   }
   return `<a href="${href.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}">${this.parser.parseInline(token.tokens)}</a>`;
  }
 };
 return new Marked({renderer}).parse(body);
}
