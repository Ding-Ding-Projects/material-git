import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { writeFile } from 'node:fs/promises';
const gh = process.env.GH_CATALOG_BINARY || 'vendor/gh_2.102.0_linux_amd64/bin/gh';
const env = {...process.env, GH_PROMPT_DISABLED:'1', GH_CONFIG_DIR:'/tmp/material-gh-catalog-empty', NO_COLOR:'1', GH_PAGER:'cat'};
const help = path => {const r = spawnSync(gh,['help',...path],{encoding:'utf8',env,timeout:10000}); if(r.status!==0) throw new Error(`Help failed: ${path.join(' ')}`); return r.stdout;};
const version = spawnSync(gh,['--version'],{encoding:'utf8'}).stdout;
if (!version.startsWith('gh version 2.102.0 ')) throw new Error('Catalog requires gh 2.102.0');
const section=(s,name)=>s.match(new RegExp(`(?:^|\\n)${name}\\n([\\s\\S]*?)(?=\\n[A-Z][A-Z ]+\\n|$)`))?.[1]?.trim() || '';
const commands=[];
function usageArguments(text){
 const groups=[];const pairs={'[':']','{':'}','<':'>'};
 for(let i=0;i<text.length;i++){if(!pairs[text[i]])continue;const start=i;const stack=[pairs[text[i]]];
  while(stack.length&&++i<text.length){if(pairs[text[i]])stack.push(pairs[text[i]]);else if(text[i]===stack.at(-1))stack.pop();}
  if(stack.length)throw new Error(`Unbalanced command usage: ${text}`);
  const repeat=text.slice(i+1,i+4)==='...';groups.push([text.slice(start,i+1),repeat,start]);if(repeat)i+=3;
 }return groups;
}
function walk(path) {
 const h=help(path).replaceAll(homedir(),'~'); const children=[];
 for(const match of h.matchAll(/^  ([a-z][a-z0-9-]*):\s+(.+)$/gm)) {
 const before=h.slice(0,match.index); const heading=before.match(/(?:^|\n)([A-Z][A-Z ]+)\n/g)?.at(-1)?.trim();
 if(heading?.includes('COMMANDS') && heading!=='ALIAS COMMANDS') children.push(match[1]);
 }
 if(children.length) {for(const c of children) walk([...path,c]); return;}
 if(!path.length) return;
 const usage=section(h,'USAGE').split('\n')[0];
 const options=[];
 for(const line of (section(h,'FLAGS')+'\n'+section(h,'INHERITED FLAGS')).split('\n')) {
 const m=line.match(/^\s*(?:-\w,\s*)?--([\w-]+)(?:\s+(\S+))?\s{2,}(.+)$/); if(!m || m[1]==='help')continue;
 const [,name,kind,description]=m; const candidates=description.match(/\{([^}]+)\}/)?.[1]?.split(/[|,]/).map(value=>value.trim()); const choices=(candidates?.length>1||candidates?.length===1&&/:\s*\{/.test(description))&&candidates.every(value=>/^[a-z0-9_.-]+$/i.test(value))?candidates:undefined;
 let type=kind ? 'text':'boolean'; if(/^u?int(?:32|64)?$/.test(kind||''))type='number'; if(choices)type='choice';
 if(kind&&['body','notes','description'].includes(name))type='multiline'; if(kind&&(kind==='file'||/^(?:body-file|notes-file|from-file|env-file|input|attach)$/.test(name)))type='file'; if(kind&&/^(?:dir|directory|source)$/.test(name))type='directory'; if(kind&&/^(?:token|password|secret)$/.test(name))type='secret';
 const entity=({repo:'repository',assignee:'user',author:'user',reviewer:'user',label:'label',milestone:'milestone',project:'project',branch:'branch',base:'branch',head:'branch',workflow:'workflow',owner:'owner',organization:'organization',environment:'environment',team:'team',discussion:'discussion',org:'organization',env:'environment',repos:'repository'})[name]; if(entity && !choices)type='entity';
 const def=description.match(/\(default (?:(?:"([^"]*)")|([^)]*))\)/);
 const rawDefault=def?.[1]??def?.[2]; let defaultValue=rawDefault; if(type==='boolean')defaultValue=rawDefault==='true'?true:rawDefault==='false'?false:undefined;else if(type==='number')defaultValue=rawDefault!==undefined&&Number.isFinite(Number(rawDefault))?Number(rawDefault):undefined;else if(rawDefault?.startsWith('[')||choices&&!choices.includes(rawDefault))defaultValue=undefined;
 options.push({name,description,type,...(choices?{choices}:{}),...(entity?{entity}:{}),...(['strings','stringArray','stringSlice'].includes(kind)?{multiple:true}:{}),...(defaultValue!==undefined?{default:defaultValue}:{}),...(type==='number'?{minimum:0}: {})});
 }
 const args=[]; const tail=usage.replace(/^gh\s+/,'').slice(path.join(' ').length).replace(/\[flags\]/g,'');
 for(const [raw,repeat,start] of usageArguments(tail)) { if(raw.slice(1,-1).trim().startsWith('-')||/(?:^|\s)--?[a-z][\w-]*\s*$/i.test(tail.slice(0,start)))continue; const contents=raw.slice(1,-1).replace(/[<>]/g,'').trim().split('|').filter(value=>!value.trim().startsWith('--')).join('|');
 const name=contents.replace(/\s*\|\s*/g,'-').replace(/\[@version\]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-').replace(/-+/g,'-').replace(/^-+|-+$/g,'').toLowerCase(); if(name==='flags')continue;
 const choices=contents.split('|').map(x=>x.trim());
 const entity=name==='repository'?'repository':name==='owner'?'owner':name==='workflow-id'?'workflow':name==='run-id'?'run':name==='gist'?'gist':/number/.test(name)?(path[0]==='pr'?'pull-request':path[0]==='issue'?'issue':path[0]==='project'?'project':undefined):undefined;
 const literalChoices=choices.length>1&&!raw.includes('<')&&choices.every(choice=>/^[a-z0-9_.-]+$/i.test(choice));
 args.push({name,description:raw,position:args.length,type:literalChoices?'choice':entity?'entity':/directory/.test(name)?'directory':/file|path/.test(name)?'file':'text',required:raw.startsWith('<')||raw.startsWith('{'),...(literalChoices?{choices}:{}),...(entity?{entity}:{}),...(repeat||contents.includes('...')?{multiple:true}:{})});
 }
 const jsonFields=section(h,'JSON FIELDS').split(/[\s,]+/).filter(Boolean); const json=options.find(o=>o.name==='json'); if(json&&jsonFields.length){json.type='multi-choice';json.choices=jsonFields;json.multiple=true;}
 const id=path.join(' ');
 const option=name=>options.find(o=>o.name===name);
 const argument=name=>args.find(o=>o.name===name);
 const enumOption=(name,choices)=>{const item=option(name);if(item){item.type=item.multiple?'multi-choice':'choice';item.choices=choices;}};
 if(id==='secret set'&&option('body'))option('body').type='secret';
 if(id==='skill install'){const agentValues=[...h.matchAll(/^  - .+ \(([a-z0-9.-]+)\)$/gm)].map(m=>m[1]);if(agentValues.length)enumOption('agent',agentValues);}
 if(id==='completion'){args.length=0;enumOption('shell',['bash','zsh','fish','powershell']);option('shell').required=true;}
 if(id==='config set'&&argument('value'))argument('value').type='text';
 if(id==='api'){if(option('method'))delete option('method').default;enumOption('method',['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']);enumOption('hostname',['github.com']);}
 if(['issue create','pr create','pr revert'].includes(id)){for(const name of ['title','body'])if(option(name))option(name).required=true;}
 if(id==='gist create'){args.splice(0,args.length,{name:'filename-pattern',description:'One or more local filenames or glob patterns. Standard input is unavailable in this runner.',position:0,type:'file',multiple:true,required:true});}
 if(id==='release create'){const assets=argument('filename-pattern');if(assets){assets.type='file';delete assets.choices;assets.multiple=true;assets.description='Local release asset filenames or glob patterns; append #display label when needed.';}if(argument('tag'))argument('tag').required=true;}
 if(id==='alias delete'){args.splice(0,args.length,{name:'alias',description:'Alias name; omit only when --all is selected',position:0,type:'text',required:false});}
 if(id==='extension create'){enumOption('precompiled',['go','other']);if(argument('name'))argument('name').required=true;}
 if(id==='extension exec'&&argument('args'))argument('args').multiple=true;
 if(id==='copilot'&&argument('args'))argument('args').multiple=true;
 if(id==='preview prompter'&&argument('prompt-type')){argument('prompt-type').type='choice';argument('prompt-type').choices=[...h.matchAll(/^- ([a-z-]+)$/gm)].map(match=>match[1]);}
 if(id==='codespace ssh'&&option('server-port'))option('server-port').maximum=65535;
 if(id==='alias import'&&argument('filename'))argument('filename').required=true;
 if(id==='extension upgrade'){args.splice(0,args.length,{name:'name',description:'Extension name; omit only when --all is selected',position:0,type:'text',required:false});}
 if(['attestation download','attestation verify'].includes(id)&&args[0])args[0].required=true;
 if(id==='attestation verify')for(const name of ['bundle','custom-trusted-root'])if(option(name))option(name).type='file';
 if(id==='attestation trusted-root'&&option('tuf-root'))option('tuf-root').type='file';
 if(id==='repo read-file'&&option('output'))option('output').type='file';
 if(id==='codespace cp'&&option('expand'))option('expand').description+=' Unavailable in the guided runner because it evaluates remote shell expressions.';
 if(id==='codespace cp'){args.splice(0,args.length,{name:'sources',description:'Local or remote: source paths',position:0,type:'text',multiple:true,required:true},{name:'dest',description:'Local or remote: destination path',position:1,type:'text',required:true});}
 if(id==='codespace ports forward'){args.splice(0,args.length,{name:'port-mappings',description:'Remote/local port pairs, such as 8080:8080. Each port must be 1–65535.',position:0,type:'text',multiple:true,required:true});}
 if(id==='codespace ports visibility'){args.splice(0,args.length,{name:'port-visibility',description:'Port/visibility pairs, such as 8080:private. Visibility is public, private, or org.',position:0,type:'text',multiple:true,required:true});}
 if(id==='issue edit'&&args[0])args[0].multiple=true;
 if(/^workflow (disable|enable|run|view)$/.test(id)&&args[0]){args[0].type='entity';args[0].entity='workflow';args[0].required=true;}
 if(path[0]==='project'&&id!=='project item-edit'&&argument('number'))argument('number').required=true;
 if(['gist view','repo rename','run cancel','run delete','gpg-key add','ssh-key add'].includes(id)&&args[0])args[0].required=true;
 if(id==='gist edit'&&option('add'))option('add').type='file';
 if(['issue develop','pr checkout'].includes(id)&&option('worktree'))option('worktree').type='directory';
 if(id==='codespace ssh'&&option('debug-file'))option('debug-file').type='file';
 if(id==='gist rename'||id==='repo read-dir'||id==='repo read-file')for(const arg of args){arg.type='text';delete arg.choices;}
 if(id==='repo create'&&option('template')){option('template').type='entity';option('template').entity='repository';}
 if(id==='pr create'&&option('template'))option('template').type='file';
 if(id==='issue create'&&option('template'))option('template').type='text';
 for(const o of options){if(/Go template/.test(o.description))o.type='multiline';if(['profile','filename'].includes(o.name))o.type='text';if(/(?:[Pp]ath to (?:the )?.*(?:file|root\.json)|file on disk)/.test(o.description)&&o.name!=='devcontainer-path')o.type='file';}
 if(/^(?:issue|pr) (?:create|edit)$/.test(id)){for(const o of options)if(['assignee','reviewer','label','project','attach','blocked-by','blocking'].includes(o.name))o.multiple=true;}
 if(id==='browse'){args.splice(0,args.length,{name:'location',description:'Optional issue/PR number, repository path, or commit SHA',position:0,type:'text'});if(option('no-browser'))option('no-browser').default=true;}
 if(id==='repo clone'){
  const passthrough=args.find(a=>a.name.startsWith('gitflags')||a.name.includes('gitflags'));if(passthrough)passthrough.description='Raw git flag forwarding is unavailable; use the guided git controls.';
  options.push({name:'git-depth',description:'Limit clone history to this many commits',type:'number',minimum:1,maximum:2147483647},{name:'git-branch',description:'Clone this branch or tag',type:'entity',entity:'branch'},{name:'git-single-branch',description:'Clone only one branch',type:'boolean'});
 }
 if(id==='config get'||id==='config set'){
  const key=argument('key');if(key){key.type='choice';key.choices=['git_protocol','prompt','prefer_editor_prompt','clipboard','color_labels','accessible_colors','accessible_prompter','spinner','telemetry','editor','pager','browser','api_host','http_unix_socket'];}
 }
 for(const o of options){if(o.type==='number'){o.minimum=['limit','interval','port','max-items','num-attempts','git-depth'].includes(o.name)?1:0;o.maximum=['port','server-port'].includes(o.name)?65535:2147483647;}if((['api','workflow run'].includes(id)&&['field','raw-field','header'].includes(o.name))||o.name==='repos'){o.multiple=true;o.description+=' Repeat this structured value for each item.';}if(['body-file','notes-file','from-file','input','attach'].includes(o.name))o.type='file';}
 const blocked=/^auth (login|refresh|token|setup-git)|^codespace (ssh|code|jupyter)|^copilot$|^preview prompter$|^extension (exec|install|upgrade|create|browse)$|^alias import$/.test(id);
 const availability=blocked?(id.startsWith('auth ')?'Use the dedicated GitHub accounts panel; authentication output is excluded from command history.':id==='preview prompter'?'Native preview requires an interactive terminal; the CLI workflows panel provides clearly labelled Material previews.':id==='copilot'?'Use CLI workflows to review an installed Copilot executable; implicit executable downloads are unavailable.':'Use the dedicated CLI workflows panel for structured inputs and explicit external-program review.'):undefined;
 const mutation=/\b(create|edit|delete|close|reopen|merge|upload|download|add|remove|set|import|fork|clone|rename|transfer|archive|unarchive|enable|disable|cancel|rerun|start|stop|restore|rebuild|publish|lock|unlock|comment|review|ready|develop|checkout|sync|install|uninstall|upgrade|refresh|login|logout|setup-git|mark-template|unmark-template|copy|pin|unpin|revert|update-branch|switch|run|link|unlink|clear-cache)\b/.test(path.at(-1))||id==='api'||id==='skill update'||['codespace cp','codespace ports forward','codespace ports visibility','codespace ssh','codespace code','codespace jupyter','extension exec','copilot'].includes(id);
 commands.push({id,path,title:id,summary:h.split('\n')[0],description:h.split('\nUSAGE\n')[0].trim(),usage,group:path[0],options,arguments:args,mutation,destructive:mutation, ...(blocked?{interactive:true,availability}:{}),...(section(h,'JSON FIELDS')?{jsonFields:section(h,'JSON FIELDS').split(/[\s,]+/).filter(Boolean)}:{})});
}
walk([]);
await writeFile('data/gh-catalog.json',JSON.stringify({version:'2.102.0',generatedAt:'2026-10-08T00:00:00.000Z',source:'https://github.com/cli/cli/releases/tag/v2.102.0 (checksum-verified official binary help)',commands},null,2)+'\n');
console.log(`Generated ${commands.length} command definitions`);
