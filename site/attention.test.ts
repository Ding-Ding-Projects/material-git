import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialAttention,validateAttention,attentionChanged,elapsedMinutes,momentumVisible,pauseMomentum,dismissMomentum,momentumIdleMs,momentumPauseMs} from '../src/site-shared/attention';

test('inactivity prompts have exact idle boundaries and no completion score',()=>{
  const start=1_000_000,state=initialAttention(start);
  assert.equal(momentumVisible(state,start+momentumIdleMs-1),false);
  assert.equal(momentumVisible(state,start+momentumIdleMs),true);
  assert.equal(elapsedMinutes(start,start+momentumIdleMs),15);
  assert.equal(elapsedMinutes(start,start-60_000),0);
  assert.deepEqual(Object.keys(state).sort(),['changedAt','dismissedChangedAt','pausedUntil']);
});
test('not now persists for the full hour and changes do not cancel that choice',()=>{
  const start=1_000_000,paused=pauseMomentum(initialAttention(start),start+momentumIdleMs);
  const loaded=validateAttention(JSON.parse(JSON.stringify(paused)));
  assert.equal(momentumVisible(loaded,loaded.pausedUntil-1),false);
  assert.equal(momentumVisible(loaded,loaded.pausedUntil),true);
  assert.equal(loaded.pausedUntil,start+momentumIdleMs+momentumPauseMs);
  assert.equal(momentumVisible(attentionChanged(loaded,start+momentumIdleMs+60_000),loaded.pausedUntil-1),false);
});
test('dismissal lasts until real work changes and old records migrate safely',()=>{
  const start=1_000_000,dismissed=dismissMomentum(initialAttention(start));
  assert.equal(momentumVisible(validateAttention(dismissed),start+24*60*60_000),false);
  const changed=attentionChanged(dismissed,start+24*60*60_000);
  assert.equal(momentumVisible(changed,changed.changedAt+momentumIdleMs),true);
  assert.deepEqual(validateAttention(undefined,start),initialAttention(start));
  for(const value of [null,[],{changedAt:-1,pausedUntil:0,dismissedChangedAt:0},{changedAt:1,pausedUntil:'0',dismissedChangedAt:0},{...initialAttention(start),unexpected:1}])assert.throws(()=>validateAttention(value));
});
