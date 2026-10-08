const safeId=(id:string)=>/^[a-zA-Z0-9._-]{1,128}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
function hash(text:string):string{let a=2166136261,b=5381;for(const c of text){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b,33)^c.charCodeAt(0);}return(a>>>0).toString(36)+(b>>>0).toString(36);}
/** No provider text, input values, labels or file paths enter generated identifiers. */
export function appearanceTargetId(node:HTMLElement):string{
 const explicit=node.dataset.designId;if(explicit&&safeId(explicit))return explicit;
 if(node.dataset.appearanceId&&safeId(node.dataset.appearanceId))return node.dataset.appearanceId;
 const path:string[]=[];let current:Element|null=node;
 while(current&&path.length<32){const stable=current.getAttribute('data-design-id');if(stable&&safeId(stable)){path.unshift('anchor:'+stable);break;}const parent:HTMLElement|null=current.parentElement;
  const siblings=parent?[...parent.children].filter(c=>c.localName===current!.localName):[];
  path.unshift(current.localName+':'+siblings.indexOf(current));
  if(parent)current=parent;else{const root=current.getRootNode();current=root instanceof ShadowRoot?root.host:null;path.unshift('shadow');}
 }
 const id='element-'+hash(path.join('/'));return id;
}
