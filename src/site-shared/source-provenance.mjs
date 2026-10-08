const repository='https://github.com/Ding-Ding-Projects/material-git';

/** A hosting packager may pin its exact upstream archive independently of Sites Git. */
export function validateUpstreamSource(record,hostingPresent){
 if(!hostingPresent||record===undefined)return null;
 const fields=['schemaVersion','repository','commit','updatedAt'];
 if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).length!==fields.length||fields.some(field=>!Object.hasOwn(record,field))||record.schemaVersion!==1||record.repository!==repository||typeof record.commit!=='string'||!/^[a-f0-9]{40}$/.test(record.commit)||typeof record.updatedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(record.updatedAt)||!Number.isFinite(Date.parse(record.updatedAt)))throw Error('Invalid hosting upstream source provenance');
 return {repository:record.repository,commit:record.commit,updatedAt:record.updatedAt};
}
