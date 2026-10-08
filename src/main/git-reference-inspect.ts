import {referenceInspectorKinds,resolvedGitSettingChoices,type ReferenceInspectorKind} from '../shared/git-reference-inspect';
export {referenceInspectorKinds,type ReferenceInspectorKind} from '../shared/git-reference-inspect';
interface Context {reference:(value:unknown,label?:string)=>string;safePath:(value:unknown,missing?:boolean)=>string;}
const schemas:Record<ReferenceInspectorKind,readonly string[]>={'validate-reference':['candidate','branch','normalize'],'branch-summary':['references','more','list'],'resolved-setting':['setting'],'index-working-diff':['path','output','ignoreWhitespace'],'tree-index-diff':['path','output','ignoreWhitespace','revision','cached']};
const resolvedGitSettings=resolvedGitSettingChoices.map(choice=>choice[0]);
/** Purpose-specific reads with exact schemas; values never select commands or options. */
export function buildGitReferenceInspection(kind:ReferenceInspectorKind,fields:Record<string,unknown>,context:Context):{argv:string[]} {
 if(!Object.hasOwn(schemas,kind))throw new Error('Choose a supported reference inspection');
 if(!fields||typeof fields!=='object'||Array.isArray(fields))throw new Error('Choose structured inspection fields');
 for(const key of Object.keys(fields))if(!schemas[kind].includes(key))throw new Error(`Unknown reference inspection field: ${key}`);
 for(const key of ['branch','normalize','list','ignoreWhitespace','cached'])if(fields[key]!==undefined&&typeof fields[key]!=='boolean')throw new Error(`Choose a Boolean for ${key}`);
 if(kind==='validate-reference'){
  const candidate=fields.candidate;if(typeof candidate!=='string'||!candidate||candidate.length>1024||candidate.startsWith('-')||/[\0\r\n]/.test(candidate))throw new Error('Enter a bounded reference name that does not begin with an option');
  if(fields.branch&&fields.normalize)throw new Error('Branch validation cannot normalize a full reference');
  return {argv:['check-ref-format',...(fields.branch?['--branch']:fields.normalize?['--normalize']:[]),candidate]};
 }
 if(kind==='branch-summary'){
  const references=fields.references??['HEAD'];if(!Array.isArray(references)||!references.length||references.length>10)throw new Error('Choose one to ten references');
  const more=fields.more??10;if(typeof more!=='number'||!Number.isInteger(more)||more<1||more>30)throw new Error('Choose one to thirty extra commits');
  return {argv:['show-branch','--no-color',...(fields.list?['--list']:[`--more=${more}`]),'--',...references.map(value=>context.reference(value,'branch reference'))]};
 }
 if(kind==='resolved-setting'){
  const setting=fields.setting??'GIT_DEFAULT_BRANCH';if(!resolvedGitSettings.includes(setting as typeof resolvedGitSettings[number]))throw new Error('Choose a supported resolved setting');
  return {argv:['var',String(setting)]};
 }
 const output=fields.output??'stat';if(!['stat','name-status','raw','patch'].includes(String(output)))throw new Error('Choose a supported difference presentation');
 const filename=fields.path?context.safePath(fields.path,true):undefined;
 return {argv:[kind==='index-working-diff'?'diff-files':'diff-index','--no-ext-diff','--no-textconv',`--${output}`,...(fields.ignoreWhitespace?['-w']:[]),...(kind==='tree-index-diff'?[...(fields.cached===false?[]:['--cached']),context.reference(fields.revision??'HEAD','tree reference')]:[]),'--',...(filename?[filename]:[])]};
}
