import test from 'node:test';
import assert from 'node:assert/strict';
import {validateUpstreamSource} from '../src/site-shared/source-provenance.mjs';
const record={schemaVersion:1,repository:'https://github.com/Ding-Ding-Projects/material-git',commit:'44dc9d8dc30a4e327a98c8a6936f97a946feab55',updatedAt:'2026-10-08T12:44:38+00:00'};
test('only hosting consumes the validated public archive revision',()=>{assert.deepEqual(validateUpstreamSource(record,true),{repository:record.repository,commit:record.commit,updatedAt:record.updatedAt});assert.equal(validateUpstreamSource(undefined,true),null);assert.equal(validateUpstreamSource({malformed:true},false),null)});
test('hosting rejects incomplete, foreign or malformed provenance',()=>{for(const changed of [{...record,repository:'https://example.com/repository'},{...record,commit:'native-sites-head'},{...record,updatedAt:'2026-10-08'},{...record,updatedAt:'2026-99-08T12:44:38Z'},{...record,extra:true},{...record,schemaVersion:2}])assert.throws(()=>validateUpstreamSource(changed,true));for(const field of Object.keys(record)){const changed={...record};delete changed[field];assert.throws(()=>validateUpstreamSource(changed,true))}});
