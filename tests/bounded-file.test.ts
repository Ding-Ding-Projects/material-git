import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readBoundedFile } from '../src/main/bounded-file';

test('bounded reader accepts empty and exact-limit regular files', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'material-bounded-file-'));
  try {
    const file = path.join(directory, 'input.json');
    writeFileSync(file, Buffer.alloc(0));
    assert.deepEqual(readBoundedFile(file, 0), Buffer.alloc(0));
    assert.deepEqual(readBoundedFile(file, 64), Buffer.alloc(0));
    const bytes = Buffer.from([0, 255, 233, 166, 150]);
    writeFileSync(file, bytes);
    assert.deepEqual(readBoundedFile(file, bytes.length), bytes);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('bounded reader rejects over-limit files, directories and invalid limits', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'material-bounded-file-'));
  try {
    const file = path.join(directory, 'input.json');
    writeFileSync(file, '12345');
    assert.throws(() => readBoundedFile(file, 4), /size limit/);
    assert.throws(() => readBoundedFile(file, 0), /size limit/);
    assert.throws(() => readBoundedFile(directory, 64), /regular file|EISDIR/);
    for (const limit of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])
      assert.throws(() => readBoundedFile(file, limit), /Invalid file size limit/);
    // Rejected reads release the descriptor so files remain replaceable on Windows.
    writeFileSync(file, 'ok');
    assert.equal(readBoundedFile(file, 2).toString(), 'ok');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('bounded reader rejects device files without reading them', { skip: process.platform === 'win32' }, () => {
  assert.throws(() => readBoundedFile('/dev/zero', 64), /regular file/);
});
