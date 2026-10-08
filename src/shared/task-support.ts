/** Session-only task time. Switching contexts pauses the previous task without losing it. */
export class TaskClock {
 private records=new Map<string,{elapsed:number;started:number|null;paused:boolean}>();
 private key='';private enabled=false;
 constructor(private now=()=>performance.now()){}
 select(key:string,enabled:boolean){if(key===this.key&&enabled===this.enabled)return;this.stop();this.key=key;this.enabled=enabled;if(!this.records.has(key))this.records.set(key,{elapsed:0,started:null,paused:false});const record=this.records.get(key)!;if(enabled&&!record.paused)record.started=this.now();}
 private stop(){const record=this.records.get(this.key);if(record?.started!==null&&record?.started!==undefined){record.elapsed+=Math.max(0,this.now()-record.started);record.started=null;}}
 get elapsed(){const record=this.records.get(this.key);return record?record.elapsed+(record.started===null?0:Math.max(0,this.now()-record.started)):0;}
 get paused(){return this.records.get(this.key)?.paused??false;}
 pause(){this.stop();const record=this.records.get(this.key);if(record)record.paused=true;}
 resume(){const record=this.records.get(this.key);if(record){record.paused=false;if(this.enabled&&record.started===null)record.started=this.now();}}
 reset(){const record=this.records.get(this.key);if(record){record.elapsed=0;record.started=this.enabled&&!record.paused?this.now():null;}}
 suspend(){this.stop();this.enabled=false;}
}
export function elapsedLabel(milliseconds:number){const seconds=Math.floor(Math.max(0,milliseconds)/1000),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);return `${hours?`${hours}:`:''}${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
export interface PendingTask {id:string;label:string;busy:boolean;dirty:boolean}
export function nextPendingTask(tasks:PendingTask[],active:string):PendingTask|undefined{return tasks.find(task=>task.id===active&&(task.dirty||task.busy))??tasks.find(task=>task.dirty||task.busy);}
export const MOMENTUM_IDLE_MS=15*60*1000;
export const MOMENTUM_DEFER_MS=60*60*1000;
export interface MomentumChoice {version:1;deferUntil:number;dismissedChange:number}
export const momentumDefaults:MomentumChoice={version:1,deferUntil:0,dismissedChange:0};
export function momentumChoice(value:unknown,now=Date.now()):MomentumChoice{if(!value||typeof value!=='object')return {...momentumDefaults};const v=value as Partial<MomentumChoice>;if(v.version!==1||typeof v.deferUntil!=='number'||!Number.isFinite(v.deferUntil)||v.deferUntil<0||v.deferUntil>now+MOMENTUM_DEFER_MS||typeof v.dismissedChange!=='number'||!Number.isFinite(v.dismissedChange)||v.dismissedChange<0||v.dismissedChange>now)return {...momentumDefaults};return {version:1,deferUntil:v.deferUntil,dismissedChange:v.dismissedChange};}
export function showMomentum(now:number,changed:number,choice:MomentumChoice,busy=false){return !busy&&now>=choice.deferUntil&&changed>choice.dismissedChange&&now-changed>=MOMENTUM_IDLE_MS;}
