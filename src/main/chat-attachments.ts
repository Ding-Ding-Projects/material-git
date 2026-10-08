import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ChatAttachment } from '../shared/local-tools';
export interface PreparedChatImage { name: string; bytes: Uint8Array }
export const CHAT_IMAGE_LIMIT = 4 * 1024 * 1024;
const identifier = /^[a-f0-9-]{36}$/;
export function validateChatAttachment(value: unknown): ChatAttachment {
    const item = value as ChatAttachment;
    if (!item || !identifier.test(item.id) || typeof item.name !== 'string' || item.name.length > 200 || item.mime !== 'image/png' || !Number.isSafeInteger(item.bytes) || item.bytes < 1 || item.bytes > CHAT_IMAGE_LIMIT || !/^[a-f0-9]{64}$/.test(item.digest)) throw new Error('Invalid saved image attachment');
    return item;
}
export async function saveChatImages(directory: string, images: PreparedChatImage[]): Promise<ChatAttachment[]> {
    if (images.length > 4 || images.reduce((n, item) => n + item.bytes.length, 0) > CHAT_IMAGE_LIMIT) throw new Error('Use at most four images and 4 MiB normalized bytes per message');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const attachments: ChatAttachment[] = [];
    try {
        for (const image of images) {
            const bytes = Buffer.from(image.bytes);
            if (!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Chat images must be normalized by the bundled PNG worker');
            const item = validateChatAttachment({ id: randomUUID(), name: image.name, mime: 'image/png', bytes: bytes.length, digest: createHash('sha256').update(bytes).digest('hex') });
            await writeFile(join(directory,item.id+'.png'), bytes, { flag:'wx',mode:0o600 }); attachments.push(item);
        }
        return attachments;
    } catch (error) { await deleteChatImages(directory,attachments); throw error; }
}
export async function readChatImage(directory: string, attachment: ChatAttachment): Promise<string> {
    const item = validateChatAttachment(attachment), path = join(directory,item.id+'.png');
    const file=await open(path,'r');let bytes:Buffer;
    try{
        const before=await file.stat();if(!before.isFile()||before.size!==item.bytes)throw new Error('Saved image attachment changed or is missing');
        bytes=Buffer.alloc(item.bytes);let position=0;
        while(position<bytes.length){const part=await file.read(bytes,position,bytes.length-position,position);if(!part.bytesRead)throw new Error('Saved image attachment changed during read');position+=part.bytesRead;}
        const after=await file.stat();if(after.size!==before.size||after.mtimeMs!==before.mtimeMs||createHash('sha256').update(bytes).digest('hex')!==item.digest)throw new Error('Saved image attachment failed identity verification');
    }finally{await file.close();}
    return bytes.toString('base64');
}
export async function deleteChatImages(directory: string, attachments: ChatAttachment[]) {
    for (const attachment of attachments) { const item = validateChatAttachment(attachment); await unlink(join(directory,item.id+'.png')).catch(()=>{}); }
}
