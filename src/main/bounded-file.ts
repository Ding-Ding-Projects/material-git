import { constants, openSync, fstatSync, readSync, closeSync } from 'node:fs';
import { constants as bufferConstants } from 'node:buffer';

/** Read a regular file without allocating or reading more than limit + 1 bytes. */
export function readBoundedFile(file: string, limit: number): Buffer {
  if (!Number.isSafeInteger(limit) || limit < 0 || limit >= bufferConstants.MAX_LENGTH)
    throw new RangeError('Invalid file size limit');

  // Nonblocking open lets special files such as FIFOs be rejected without waiting.
  const descriptor = openSync(file, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
  try {
    const initial = fstatSync(descriptor);
    if (!initial.isFile()) throw new Error('Choose a regular file');
    if (initial.size > limit) throw new Error('File exceeds the size limit');

    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(descriptor, buffer, length, buffer.length - length, null);
      if (!count) break;
      length += count;
      if (length > limit) throw new Error('File exceeds the size limit');
    }
    // Read to limit + 1 rather than trusting the first stat if the file grows.
    if (fstatSync(descriptor).size > limit) throw new Error('File exceeds the size limit');
    return buffer.subarray(0, length);
  } finally {
    closeSync(descriptor);
  }
}
