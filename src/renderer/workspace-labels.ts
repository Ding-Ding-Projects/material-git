/** Compact visual label; the tab retains its full accessible name and tooltip. */
export function compactTabLabel(label:string,id?:string):string {
 const codes:Record<string,string>={repositories:'RP',releases:'RL',issues:'IS','pull-requests':'PR',pulls:'PR',accounts:'AC',actions:'AX'};
 const key=id?.replace(/^destination:/,'').split(':')[0]||label.toLocaleLowerCase().replaceAll(' ','-');
 if(codes[key])return codes[key];
 const words=label.replace(/[^\p{L}\p{N}\s]/gu,'').trim().split(/\s+/).filter(Boolean);
 return (words.length>1?words.slice(0,2).map(word=>Array.from(word)[0]).join(''):Array.from(words[0]||'').slice(0,2).join('')).toLocaleUpperCase()||'…';
}
