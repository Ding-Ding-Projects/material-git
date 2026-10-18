import {constants} from 'node:fs';
import {open,lstat} from 'node:fs/promises';
import type {Hash} from 'node:crypto';

/** Hash large reviewed payloads with bounded memory and stable native file identity. */
export async function hashReviewedFile(file:string,hash:Hash,signal?:AbortSignal){
 signal?.throwIfAborted();const before=await lstat(file);
 if(!before.isFile()||before.isSymbolicLink()||before.size>5*1024*1024*1024)throw Error('Reviewed payload must be a regular file within 5 GiB');
 const handle=await open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{const opened=await handle.stat();if(opened.dev!==before.dev||opened.ino!==before.ino||opened.size!==before.size||opened.mtimeMs!==before.mtimeMs)throw Error('Reviewed file changed before hashing');let bytes=0;const buffer=Buffer.allocUnsafe(256*1024);
  for(;;){signal?.throwIfAborted();const read=await handle.read(buffer,0,buffer.length,bytes);signal?.throwIfAborted();if(!read.bytesRead)break;bytes+=read.bytesRead;if(bytes>before.size)throw Error('Reviewed file grew while hashing');hash.update(buffer.subarray(0,read.bytesRead));}
  const after=await lstat(file),final=await handle.stat();if(bytes!==before.size||after.dev!==before.dev||after.ino!==before.ino||after.size!==before.size||after.mtimeMs!==before.mtimeMs||final.mtimeMs!==before.mtimeMs||final.size!==before.size)throw Error('Reviewed file changed while hashing');
 }finally{await handle.close();}
}
