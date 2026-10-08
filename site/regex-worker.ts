/** Native JavaScript regex evaluation stays in a worker with caller-owned cancellation. */
self.onmessage=(event:MessageEvent<{pattern:string;flags?:string;entries:{key:string;text:string}[]}>)=>{
 try{const{pattern,entries,flags='i'}=event.data;if(typeof pattern!=='string'||pattern.length>256||!Array.isArray(entries)||entries.length>512||!/^[imsu]*$/.test(flags)||new Set(flags).size!==flags.length)throw Error();const expression=new RegExp(pattern,flags);const matches=entries.map(({key,text})=>({key,match:expression.test(text.slice(0,16384))}));self.postMessage({matches})}catch{self.postMessage({error:'Invalid regular expression. Edit the pattern or turn regex off.'})}
};
