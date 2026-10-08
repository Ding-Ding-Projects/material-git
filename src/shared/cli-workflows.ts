import type {CommandDefinition,Operation} from './types';
export const workflowCommandIds=['extension browse','extension create','extension exec','extension install','extension upgrade','extension remove','extension list','extension search','alias import','alias set','alias delete','alias list','codespace ssh','codespace code','codespace jupyter','codespace cp','codespace ports forward','codespace ports visibility','copilot','preview prompter'] as const;
export type CliWorkflowAction='inventory'|'choices'|'review'|'apply'|'cancel'|'import-file';
export interface CliWorkflowPayload {commandId?:string;fields?:Record<string,unknown>;reviewId?:string;confirmed?:boolean;query?:string;page?:number;kind?:'codespaces'|'extensions'|'extension-search'|'aliases';operationId?:string}
export interface WorkflowChoice {value:string;label:string;detail:string;data?:Record<string,string>}
export interface WorkflowPlan {commandId:string;fields:Record<string,unknown>}
export interface CliWorkflowReview {kind:'review';reviewId:string;commandId:string;argv:string[];executable:string;warnings:string[];expiresAt:string;description:string}
export interface CliWorkflowInventory {kind:'inventory';commands:CommandDefinition[];copilotInstalled:boolean;copilotHelp?:string;blockers:{id:string;reason:string}[]}
export type CliWorkflowResponse=CliWorkflowReview|CliWorkflowInventory|{kind:'choices';items:WorkflowChoice[];hasNext:boolean;notice?:string}|{kind:'operation';operation:Operation}|{kind:'file';file:string;preview:string}|{kind:'cancelled'};
export interface CliWorkflowsBridge {cliWorkflows(action:CliWorkflowAction,payload?:CliWorkflowPayload):Promise<CliWorkflowResponse>}
