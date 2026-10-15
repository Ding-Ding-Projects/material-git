import {validateTabTarget,type WorkspaceState,type WorkspaceTab,type WorkspaceTabTarget} from './workspace';

export function targetKey(target:WorkspaceTabTarget):string {
 const t=validateTabTarget(target);
 return t.kind==='local'?`local:${t.key}`:t.kind==='github'?`github:${t.hostname}/${t.repository}`:`utility:${t.lane}`;
}
export function tabLane(tab:WorkspaceTab):string {return tab.lane??(tab.target?.kind==='local'?'git':tab.target?.kind==='github'?'issues':tab.target?.kind==='utility'?tab.target.lane:tab.id);}
/** Legacy records remain intact; only recognized desktop destinations acquire target metadata. */
export function migrateDesktopTabs(state:WorkspaceState,lanes:string[]):WorkspaceState {
 return {...state,tabs:state.tabs.map(tab=>tab.target?tab:{...tab,...(lanes.includes(tab.id)?{target:{kind:'utility' as const,lane:tab.id}}:{})})};
}
export function openWorkspaceTab(state:WorkspaceState,target:WorkspaceTabTarget,label:string,id:string):WorkspaceState {
 const normalized=validateTabTarget(target),key=targetKey(normalized),existing=state.tabs.find(tab=>tab.target&&targetKey(tab.target)===key);
 if(existing)return {...state,activeTab:existing.id,lane:tabLane(existing)};
 if(state.tabs.length>=100)throw Error('Close a tab before opening another. The workspace supports 100 tabs.');
 const lane=normalized.kind==='local'?'git':normalized.kind==='github'?'issues':normalized.lane;
 const tab:WorkspaceTab={id,label,pinned:false,group:'',target:normalized,lane};
 return {...state,tabs:[...state.tabs,tab],activeTab:id,lane};
}

/** Keep live owner identities when an imported/history layout references the same destination differently. */
export function retainWorkingTabs(incoming:WorkspaceState,current:WorkspaceState,workingIds:string[]):WorkspaceState {
 const working=current.tabs.filter(tab=>workingIds.includes(tab.id));if(!working.length)return incoming;
 const same=(left:WorkspaceTab,right:WorkspaceTab)=>left.id===right.id||!!left.target&&!!right.target&&targetKey(left.target)===targetKey(right.target);
 const selected=incoming.tabs.find(tab=>tab.id===incoming.activeTab),replacement=selected?working.find(tab=>same(tab,selected)):undefined;
 const tabs=[...incoming.tabs.filter(tab=>!working.some(owner=>same(tab,owner))),...working];
 const groups=[...incoming.groups,...current.groups.filter(group=>working.some(tab=>tab.group===group.id)&&!incoming.groups.some(row=>row.id===group.id))];
 return {...incoming,tabs,groups,...(replacement?{activeTab:replacement.id,lane:tabLane(replacement)}:{})};
}
