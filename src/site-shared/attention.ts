export const momentumIdleMs = 15 * 60_000;
export const momentumPauseMs = 60 * 60_000;
export interface AttentionState {
  changedAt: number;
  pausedUntil: number;
  dismissedChangedAt: number;
}
export function initialAttention(now = Date.now()): AttentionState {
  return {changedAt: now, pausedUntil: 0, dismissedChangedAt: 0};
}
export function validateAttention(value: unknown, now = Date.now()): AttentionState {
  if (value === undefined) return initialAttention(now);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid attention record');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !['changedAt', 'pausedUntil', 'dismissedChangedAt'].includes(key)) ||
      ['changedAt', 'pausedUntil', 'dismissedChangedAt'].some(key => !Number.isSafeInteger(record[key]) || Number(record[key]) < 0)) {
    throw Error('Invalid attention record');
  }
  return {...record} as unknown as AttentionState;
}
export function attentionChanged(state: AttentionState, now = Date.now()): AttentionState {
  return {...state, changedAt: now, dismissedChangedAt: 0};
}
export function elapsedMinutes(since: number, now = Date.now()): number {
  return Math.floor(Math.max(0, now - since) / 60_000);
}
export function momentumVisible(state: AttentionState, now = Date.now()): boolean {
  return now - state.changedAt >= momentumIdleMs && now >= state.pausedUntil && state.dismissedChangedAt !== state.changedAt;
}
export function pauseMomentum(state: AttentionState, now = Date.now()): AttentionState {
  return {...state, pausedUntil: now + momentumPauseMs};
}
export function dismissMomentum(state: AttentionState): AttentionState {
  return {...state, dismissedChangedAt: state.changedAt};
}
