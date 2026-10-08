import type {AppSettings,CommandDefinition} from './types';
import {defaults,settingsFields} from './preferences';
import {appearanceFields,appearanceStringChoices,appearanceStates} from './appearance';
import {nativeGitHubTaskRoutes} from './github-native';
import {workflowCommandIds} from './cli-workflows';
export interface DiscoveryRoute {lane:string;setting?:string;owner?:string;field?:string;action?:string;command?:string;area?:string;article?:string;ruleId?:string;appearanceTarget?:string;appearanceState?:string;appearanceField?:string}
export interface DiscoveryEntry extends DiscoveryRoute {id:string;label:string;detail:string;keywords:string;settingKey?:keyof AppSettings;editable?:boolean;control?:HTMLElement;unavailable?:string}
export const nestedDiscoveryFields={
 schedules:['timezone','label','priority','enabled','startDate','endDate','startTime','endTime','everyDay','source','connection','entity','values','elementIdentifier','connectionLabel','sourceUrl','refreshSeconds','token'],
 security:['currentCredential','newCredential','modeName','otpUri','account','issuer','verifyCredential','setCredential','renameMode','addAuthenticator','recovery'],
 vocabulary:['vocabulary','clear'],
} as const;
export const concealedSettings=new Set(['language','englishHumor','cantoneseHumor','vocabulary','cantoneseVoice','narrationLanguage']);
export function settingDescriptor(key:keyof AppSettings){return {...settingsFields[key],value:defaults[key],step:key==='englishHumor'||key==='cantoneseHumor'?1:key==='fontWeight'?100:key==='borderRadius'?1:0.05};}
export function commandDiscoveryRoute(command:CommandDefinition):DiscoveryRoute|undefined {
 const route=nativeGitHubTaskRoutes.find(route=>route.commandId===command.id);
 if(route){const domain=route.action.split('.')[0];return {lane:domain==='pulls'?'pull-requests':domain==='security'?'repository-security':domain,owner:'mg-github-workspace',action:route.action};}
 if((workflowCommandIds as readonly string[]).includes(command.id))return {lane:command.id.startsWith('codespace ')?'codespaces':command.id.startsWith('extension ')?'extensions':command.id.startsWith('alias ')?'aliases':'tools',command:command.id};
 return undefined;
}
export const appearanceDiscoveryFields=[...Object.keys(appearanceFields),...Object.keys(appearanceStringChoices),'fontFamily','layers','image','path'];
export const appearanceDiscoveryStates=[...appearanceStates];
