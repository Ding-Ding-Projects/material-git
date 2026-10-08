/** Read-only repository comparisons exposed as guided workflows. */
export type GitComparisonKind = 'shortlog' | 'cherry' | 'range-diff' | 'name-rev' | 'check-mailmap' | 'patch-id' | 'stripspace';
export type GitComparisonBridge = (kind: GitComparisonKind, fields: Record<string, unknown>) => Promise<import('./git').GitResponse>;
