/** Find a workspace owner through ordinary and shadow-root ancestors. */
export function workspaceScope(element:Element):string {
 let current:Element|null=element;
 while(current){const owner=current.closest<HTMLElement>('[data-surface-owner]');if(owner)return owner.dataset.surfaceOwner+'::'+(owner.dataset.surfaceLane||'');const root=current.getRootNode();current=root instanceof ShadowRoot?root.host:null;}
 return 'standalone';
}
/** Include controls inside nested Material/custom-element shadow roots. */
export function ownedControls(root:Element,selector:string):HTMLElement[]{
 const result:HTMLElement[]=[];
 const visit=(parent:Element|ShadowRoot)=>{for(const element of parent.querySelectorAll<HTMLElement>('*')){if(element.matches(selector))result.push(element);if(element.shadowRoot)visit(element.shadowRoot);}};
 visit(root);return result;
}
