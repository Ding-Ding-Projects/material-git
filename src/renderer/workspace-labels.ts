/** Compact visual label; the tab retains its full accessible name and tooltip. */
export function compactTabLabel(label:string):string {
 const words=label.replace(/[^\p{L}\p{N}\s]/gu,'').trim().split(/\s+/).filter(Boolean);
 return (words.length>1?words.slice(0,2).map(word=>Array.from(word)[0]).join(''):Array.from(words[0]||'').slice(0,2).join('')).toLocaleUpperCase()||'…';
}
