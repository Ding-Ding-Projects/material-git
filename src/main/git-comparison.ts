import type {GitComparisonKind} from '../shared/git-comparison';
export type {GitComparisonKind} from '../shared/git-comparison';

export interface GitComparisonContext {
  reference: (value: unknown, label?: string) => string;
  safePath: (value: unknown, missing?: boolean) => string;
}
export interface GitComparisonPlan {argv: string[]; input?: string;}
const schemas: Record<GitComparisonKind, readonly string[]> = {
  shortlog: ['refs', 'group', 'email', 'page', 'pageSize'],
  cherry: ['upstream', 'head', 'limit'],
  'range-diff': ['oldBase', 'oldTip', 'newBase', 'newTip', 'creationFactor'],
  'name-rev': ['commits', 'nameScope'],
  'check-mailmap': ['identities'],
  'patch-id': ['patch', 'strategy'],
  stripspace: ['text', 'comments'],
};
function choice(value: unknown, fallback: string, choices: readonly string[], label: string): string {
  const selected = value === undefined ? fallback : value;
  if (typeof selected !== 'string' || !choices.includes(selected)) throw new Error(`Choose a supported ${label}`);
  return selected;
}
function integer(value: unknown, fallback: number, min: number, max: number, label: string): number {
  const selected = value === undefined ? fallback : value;
  if (typeof selected !== 'number' || !Number.isSafeInteger(selected) || selected < min || selected > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return selected;
}
function reference(context: GitComparisonContext, value: unknown, label: string): string {
  // Defense in depth: an injected context must not turn a reference into an option or revision expression.
  const selected = context.reference(value, label);
  if (typeof selected !== 'string' || !selected || selected.length > 1024 || selected.startsWith('-') || /[\x00-\x20\x7f:]|\.\.|[\\*?\[\]{}]/.test(selected)) throw new Error(`Select a single ${label}`);
  return selected;
}
function list(value: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(value) || !value.length || value.length > max) throw new Error(`Select 1 to ${max} ${label}`);
  return value;
}
function input(value: unknown, label: string, max = 200 * 1024): string {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > max || value.includes('\0')) throw new Error(`${label} must be UTF-8 text of at most ${max} bytes without NUL characters`);
  return value;
}
/** Exact fields become native argv and optional bounded stdin, never a shell expression. */
export function buildGitComparison(kind: GitComparisonKind, fields: Record<string, unknown>, context: GitComparisonContext): GitComparisonPlan {
  if (!Object.hasOwn(schemas, kind)) throw new Error('Unsupported repository comparison');
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Error('Comparison fields must be an object');
  for (const key of Object.keys(fields)) if (!schemas[kind].includes(key)) throw new Error(`Unknown comparison field: ${key}`);
  const ref = (value: unknown, label: string) => reference(context, value, label);
  switch (kind) {
    case 'shortlog': {
      const refs = list(fields.refs ?? ['HEAD'], 20, 'references').map(value => ref(value, 'reference'));
      const group = choice(fields.group, 'author', ['author', 'committer'], 'contributor grouping');
      if (fields.email !== undefined && typeof fields.email !== 'boolean') throw new Error('Show email must be a Boolean');
      const page = integer(fields.page, 0, 0, 10000, 'Page');
      const pageSize = integer(fields.pageSize, 200, 1, 1000, 'Commits per page');
      return {argv: ['shortlog', '--summary', '--numbered', `--group=${group}`, ...(fields.email ? ['--email'] : []), `--max-count=${pageSize}`, `--skip=${page * pageSize}`, ...refs, '--']};
    }
    case 'cherry': return {argv: ['cherry', '-v', ref(fields.upstream, 'upstream reference'), ref(fields.head ?? 'HEAD', 'head reference'), ...(fields.limit === undefined || fields.limit === '' ? [] : [ref(fields.limit, 'lower boundary')])]};
    case 'range-diff': {
      const oldBase = ref(fields.oldBase, 'old base'), oldTip = ref(fields.oldTip, 'old tip');
      const newBase = ref(fields.newBase, 'new base'), newTip = ref(fields.newTip, 'new tip');
      const factor = fields.creationFactor === undefined ? [] : [`--creation-factor=${integer(fields.creationFactor, 60, 1, 999, 'Creation factor')}`];
      return {argv: ['range-diff', '--no-color', '--no-dual-color', '--no-ext-diff', '--no-textconv', ...factor, `${oldBase}..${oldTip}`, `${newBase}..${newTip}`, '--']};
    }
    case 'name-rev': {
      const commits = list(fields.commits, 100, 'commits').map(value => ref(value, 'commit'));
      const scope = choice(fields.nameScope, 'all', ['all', 'tags', 'branches'], 'reference scope');
      return {argv: ['name-rev', '--always', ...(scope === 'tags' ? ['--tags'] : scope === 'branches' ? ['--refs=refs/heads/*'] : []), '--', ...commits]};
    }
    case 'check-mailmap': {
      const identities = list(fields.identities, 100, 'identities').map(value => {
        const line = input(value, 'Identity', 1000);
        if (!line.trim() || /[\r\n]/.test(line) || !/^[^<>]*<[^<>\s]+@[^<>\s]+>$/.test(line)) throw new Error('Use one identity per line: Name <email@example.com>');
        return line;
      });
      return {argv: ['check-mailmap', '--stdin'], input: identities.join('\n') + '\n'};
    }
    case 'patch-id': {
      const strategy = choice(fields.strategy, 'stable', ['stable', 'verbatim'], 'patch identity strategy');
      const patch = input(fields.patch, 'Patch');
      if (!patch.trim()) throw new Error('Paste a nonempty Git patch');
      return {argv: ['patch-id', `--${strategy}`], input: patch.endsWith('\n') ? patch : patch + '\n'};
    }
    case 'stripspace': {
      const comments = choice(fields.comments, 'keep', ['keep', 'remove', 'add'], 'comment handling');
      return {argv: ['-c', 'core.commentChar=#', 'stripspace', ...(comments === 'remove' ? ['--strip-comments'] : comments === 'add' ? ['--comment-lines'] : [])], input: input(fields.text, 'Text')};
    }
  }
}
