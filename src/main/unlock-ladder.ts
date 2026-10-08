import {randomInt,randomUUID} from 'node:crypto';
interface Challenge {nonce:string;kind:'dish'|'sums'|'moles';expires:number;started:number;answer:unknown;hits?:Set<number>;schedule?:Array<{cell:number;at:number;until:number}>}
/** Only clears a wait; it cannot create a credential session. All grading stays in the main process. */
export class UnlockLadder {
 private failures=0;private until=0;private escalation=0;private skips:number[];private challenge?:Challenge;private rung:'dish'|'sums'|'moles'|'clock'='dish';private dishesWrong=0;
 constructor(private now:()=>number=Date.now,skips:number[]=[]){this.skips=skips;}
 check(){if(this.now()<this.until)throw new Error('Too many attempts; use the waiting games or wait before trying again');if(this.until){this.until=0;this.failures=0;this.challenge=undefined;}}
 result(valid:boolean){if(valid){this.failures=0;this.until=0;this.escalation=0;this.challenge=undefined;}else if(++this.failures>=5){this.until=this.now()+Math.min(1800000,30000*2**this.escalation++);this.rung='dish';this.dishesWrong=0;}return valid;}
 status(){return{waitingUntil:this.until,remainingAttempts:Math.max(0,5-this.failures),skipsRemaining:Math.max(0,3-this.skips.filter(t=>t>this.now()-3600000).length)};}
 generate(school:boolean){const now=this.now();if(now>=this.until)throw new Error('No waiting period is active');for(let index=this.skips.length-1;index>=0;index--)if(this.skips[index]<=now-3600000)this.skips.splice(index,1);if(this.skips.length>=3||this.rung==='clock')throw new Error('Waiting game budget is exhausted; wait for the clock');if(school&&this.rung==='dish')this.rung='sums';let answer:unknown;let data:Record<string,unknown>={};
 if(this.rung==='dish'){const dishes=['Steamed shrimp dumpling','Pork dumpling','Barbecue pork bun','Egg tart'];const selected=randomInt(4);answer=selected;data={question:`Choose ${dishes[selected]}`,choices:dishes};}
 else if(this.rung==='sums'){const sums=Array.from({length:10},()=>({left:randomInt(1,40),right:randomInt(1,40)}));answer=sums.map(s=>s.left+s.right);data={sums};}
 else {const schedule=Array.from({length:12},(_,i)=>({cell:randomInt(9),at:i*750,until:i*750+650}));answer=null;data={duration:9000,schedule,required:8};}
 const challenge:Challenge={nonce:randomUUID(),kind:this.rung,started:now,expires:now+120000,answer,...(this.rung==='moles'?{schedule:data.schedule as Challenge['schedule'],hits:new Set<number>()}:{})};this.challenge=challenge;return{nonce:challenge.nonce,kind:challenge.kind,expires:challenge.expires,started:now,...data,...this.status()};}
 hit(nonce:unknown,cell:unknown){const challenge=this.challenge,elapsed=this.now()-(challenge?.started??0);if(!challenge||challenge.kind!=='moles'||challenge.nonce!==nonce||this.now()>challenge.expires||!Number.isInteger(cell))throw new Error('Invalid or expired timed round');const index=challenge.schedule!.findIndex(m=>m.cell===cell&&elapsed>=m.at&&elapsed<m.until);if(index<0||challenge.hits!.has(index))throw new Error('No unhit mole is visible in that cell');challenge.hits!.add(index);return{hits:challenge.hits!.size};}
 answer(nonce:unknown,value:unknown){const challenge=this.challenge;this.challenge=undefined;const now=this.now();if(!challenge||nonce!==challenge.nonce||now>challenge.expires||now>=this.until)throw new Error('Waiting challenge expired or was already used');let valid=false;
 if(challenge.kind==='dish')valid=Number.isInteger(value)&&value===challenge.answer;
 else if(challenge.kind==='sums')valid=Array.isArray(value)&&value.length===10&&value.every((n,i)=>Number.isInteger(n)&&n===(challenge.answer as number[])[i]);
 else valid=now-challenge.started>=9000&&value==='finish'&&(challenge.hits?.size??0)>=8;
 if(valid){this.skips.push(now);this.until=0;this.failures=0;return{cleared:true,...this.status()};}
 if(challenge.kind==='dish'){if(++this.dishesWrong>=5)this.rung='sums';}else this.rung=challenge.kind==='sums'?'moles':'clock';return{cleared:false,next:this.rung,...this.status()};}
}
