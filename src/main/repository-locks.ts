/** Process-wide exclusion for mutations sharing a canonical Git object store. */
const owners=new Map<string,string>();
export function acquireRepositoryLock(commonDir:string,owner:string):()=>void {
 if(owners.has(commonDir))throw new Error('Another operation is already changing this repository. Wait for it to finish.');
 owners.set(commonDir,owner);let released=false;
 return ()=>{if(!released&&owners.get(commonDir)===owner){owners.delete(commonDir);released=true;}};
}
export function repositoryLocked(commonDir:string):boolean{return owners.has(commonDir);}
