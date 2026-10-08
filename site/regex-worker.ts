/** Regular-expression execution stays off the UI thread. The caller bounds lifetime. */
self.onmessage = (event: MessageEvent<{pattern: string; entries: {key: string; text: string}[]}>) => {
 const {pattern,entries} = event.data;
 try {
  if(pattern.length>256 || entries.length>512) throw new Error('Search exceeds the supported limit.');
  const expression = new RegExp(pattern,'iu');
  const matches = entries.map(({key,text})=>({key,match:expression.test(text.slice(0,16384))}));
  self.postMessage({matches});
 } catch {
  self.postMessage({error:'Invalid regular expression. Edit the pattern or turn regex off.'});
 }
};
