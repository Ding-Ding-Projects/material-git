import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Read-only inventory from official source archives; never invokes repository actions.
export async function inventoryGit(source) {
  const docs = path.join(source, 'Documentation');
  const files = new Map();
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith('.adoc')) files.set(path.relative(docs, file), await readFile(file, 'utf8'));
    }
  }
  await walk(docs);
  const list = await readFile(path.join(source, 'command-list.txt'), 'utf8');
  const categories = new Map(list.split('\n').filter(line => line.startsWith('git-')).map(line => {
    const [name, category, ...groups] = line.trim().split(/\s+/);
    return [name.slice(4), { category, groups }];
  }));
  const builtins = new Set([...((await readFile(path.join(source, 'git.c'), 'utf8')).matchAll(/\{\s*"([\w-]+)",\s*cmd_/g))].map(match => match[1]));
  function expanded(file, seen = new Set()) {
    if (seen.has(file)) return '';
    seen.add(file);
    return (files.get(file) ?? '').replace(/^include::([^\[]+)\[.*$/gm, (_, relative) => expanded(path.normalize(path.join(path.dirname(file), relative)), seen));
  }
  const guides = [];
  const commands = [];
  for (const name of [...new Set([...categories.keys(), ...builtins])].sort()) {
    const group = categories.get(name) ?? { category: 'internal-builtin', groups: [] };
    if (['guide', 'userinterfaces', 'developerinterfaces'].includes(group.category)) { guides.push({ name, ...group }); continue; }
    const file = `git-${name}.adoc`;
    const text = expanded(file);
    const options = [...new Set([...text.matchAll(/(?:^|[\s`'|\[,])(--[a-zA-Z][\w-]*|-[a-zA-Z0-9])(?=[\s`'=,\[<>.:|\]]|$)/gm)].map(m => m[1]))].sort();
    const helpGroups = [...new Set([...text.matchAll(/^([A-Z][A-Z /_-]+)\n[-~]{3,}$/gm)].map(m => m[1]))];
    const subcommands = [...new Set([...text.matchAll(/^`?([a-z][a-z-]+)`?(?:\s+[^\n]*)?::\s*$/gm)].map(m => m[1]).filter(m => !m.startsWith('no-')))];
    commands.push({ name, builtin: builtins.has(name), ...group, reference: files.has(file) ? file : null, options, helpGroups, documentedSubcommandLabels: subcommands });
  }
  const configuration = [];
  for (const [file, text] of files) {
    if (!file.startsWith('config/')) continue;
    const section = path.basename(file, '.adoc');
    for (const match of text.matchAll(/^`?([A-Za-z][A-Za-z0-9_.<>*-]*?)`?(:::?)\s*$/gm)) {
      const key = match[2] === ':::' ? `${section}.${match[1]}` : match[1];
      configuration.push({ key, reference: file });
    }
  }
  const environment = new Map();
  for (const [file, text] of files) for (const match of text.matchAll(/\b(GIT_[A-Z][A-Z0-9_]*|GIT_CONFIG_KEY_\d+|GIT_CONFIG_VALUE_\d+)\b/g)) {
    const references = environment.get(match[1]) ?? new Set(); references.add(file); environment.set(match[1], references);
  }
  return { sourceDigest: createHash('sha256').update(list).digest('hex'), commands, guides, configuration: [...new Map(configuration.map(x => [x.key, x])).values()].sort((a,b) => a.key.localeCompare(b.key)), environment: [...environment].sort().map(([name,references]) => ({ name, references: [...references].sort() })) };
}

const domains = {
  changes: 'add status diff diff-files diff-index diff-pairs diff-tree restore reset clean mv rm checkout-index update-index ls-files apply',
  history: 'commit log show shortlog reflog rev-list rev-parse describe name-rev cherry range-diff annotate blame last-modified whatchanged format-rev history',
  branches: 'branch switch checkout merge rebase cherry-pick revert merge-base show-branch show-ref for-each-ref update-ref symbolic-ref replay',
  conflicts: 'rerere mergetool merge-tree merge-file merge-index merge-one-file merge-octopus merge-resolve',
  repositories: 'init clone repo scalar',
  remotes: 'fetch pull push remote ls-remote backfill fetch-pack send-pack receive-pack upload-pack remote-ext remote-fd remote-http remote-https',
  worktrees: 'worktree', stashes: 'stash', tags: 'tag verify-tag mktag',
  patches: 'am format-patch request-pull mailinfo mailsplit patch-id send-email imap-send quiltimport',
  bisect: 'bisect', notes: 'notes', submodules: 'submodule submodule--helper',
  sparse: 'sparse-checkout', settings: 'config var check-attr check-ignore check-mailmap check-ref-format interpret-trailers hook credential credential-cache credential-store credential-cache--daemon',
  objects: 'cat-file ls-tree hash-object mktree write-tree read-tree commit-tree replace unpack-file',
  maintenance: 'gc maintenance prune repack pack-refs refs commit-graph multi-pack-index count-objects fsck verify-pack pack-objects index-pack prune-packed pack-redundant unpack-objects show-index',
  transfer: 'archive bundle fast-export fast-import get-tar-commit-id',
  diagnostics: 'bugreport diagnose help version grep',
  integrations: 'archimport cvsexportcommit cvsimport cvsserver svn p4 gui citool gitk gitweb instaweb difftool web--browse for-each-repo',
  hosting: 'daemon http-backend upload-archive update-server-info',
};
const readOnly = new Set('status log show shortlog diff diff-files diff-index diff-pairs diff-tree describe name-rev cherry range-diff annotate blame last-modified whatchanged rev-list rev-parse format-rev merge-base show-branch show-ref for-each-ref ls-remote ls-files cat-file ls-tree count-objects fsck verify-pack show-index get-tar-commit-id check-attr check-ignore check-mailmap check-ref-format var help version grep'.split(' '));
const destructive = new Set('reset restore clean rm checkout checkout-index read-tree update-index filter-branch prune prune-packed repack gc reflog refs branch tag update-ref symbolic-ref replace rebase replay stash worktree submodule fast-import'.split(' '));
const external = new Set('hook credential credential-cache credential-store difftool mergetool gui citool gitk gitweb instaweb web--browse send-email imap-send archimport cvsexportcommit cvsimport cvsserver svn p4 for-each-repo filter-branch'.split(' '));
export function taskMapping(command) {
  const domain = Object.entries(domains).find(([, names]) => names.split(' ').includes(command.name))?.[0] ?? 'advanced';
  const internal = command.category === 'internal-builtin' || ['synchelpers', 'purehelpers'].includes(command.category);
  const risk = external.has(command.name) ? 'external-execution-or-credentials' : readOnly.has(command.name) ? 'inspect;some-options-write-or-execute' : destructive.has(command.name) ? 'destructive-or-history-rewrite' : 'state-mutation-or-option-dependent';
  return { ...command, proposedDestination: `local-repositories/${domain}`, presentation: internal ? 'contextual-internal-operation;no-standalone-command-list' : 'rich-task-workflow', risk, permission: ['remotes','hosting','patches','integrations'].includes(domain) ? 'local-access;remote-service-or-helper-permission-when-used' : 'local-filesystem-and-repository-access', preflight: ['runtime-capability','repository-trust','HEAD-index-worktree-snapshot','path-and-ref-validation','operation-state','review-exact-effects'], recovery: readOnly.has(command.name) ? 'normally-no-state-change;inspect-selected-options' : 'operation-specific;untracked-data-and-remote-effects-may-be-irreversible', verification: ['refresh-status-and-operation-state','compare-intended-refs-index-and-paths','isolated-fixture-required'], implementation: 'not-audited-after-new-Git-service-integration', gui: 'proposed-destination;interaction-not-yet-verified', optionCoverage: command.options.map(name => ({ name, native: 'needs-action-specific-audit', gui: 'needs-rich-control-and-validation', evidence: 'official-reference-token;not-execution-proof' })) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [currentSource, olderSource, output, lfsSource] = process.argv.slice(2);
  if (!currentSource || !olderSource || !output) throw new Error('Usage: node scripts/research-git-actions.mjs CURRENT_SOURCE OLDER_SOURCE OUTPUT');
  const current = await inventoryGit(currentSource); const older = await inventoryGit(olderSource);
  const delta = (a,b,key) => a.filter(x => !new Set(b.map(y => y[key])).has(x[key])).map(x => x[key]);
  const matrix = { version: 1, checkedAt: new Date().toISOString(), scope: 'official-source-inventory;not-implementation-completion', versions: { official: '2.56.0', officialCommit: 'a018953688f1b10bddf91bff8747068f5f4746a4', bundledWindows: '2.56.0.windows.2', windowsCommit: 'cc4dbf752a05efdc0e04e71fd3e8110d11bdd35c', inspectedLinux: '2.52.0', optionalLfsLatest: '3.8.0', inspectedLfs: '3.6.1' }, sources: ['https://github.com/git/git/tree/a018953688f1b10bddf91bff8747068f5f4746a4', 'https://github.com/git-for-windows/git/releases/tag/v2.56.0.windows.2', 'https://github.com/git-lfs/git-lfs/releases/tag/v3.8.0'], sourceDigest: current.sourceDigest, counts: { commands: current.commands.length, builtinCommands: current.commands.filter(x => x.builtin).length, options: current.commands.reduce((n,x) => n+x.options.length,0), configuration: current.configuration.length, environment: current.environment.length }, deltaFromLinux: { commandsAdded: delta(current.commands,older.commands,'name'), commandsRemoved: delta(older.commands,current.commands,'name'), configurationAdded: delta(current.configuration,older.configuration,'key'), configurationRemoved: delta(older.configuration,current.configuration,'key'), changedCommandOptions: current.commands.flatMap(x => { const before = older.commands.find(y => y.name === x.name); if (!before) return []; const added=x.options.filter(n=>!before.options.includes(n)); const removed=before.options.filter(n=>!x.options.includes(n)); return added.length||removed.length ? [{name:x.name,added,removed}] : []; }) }, commands: current.commands.map(taskMapping), configuration: current.configuration.map(x => ({...x,scopeControl:'system/global/local/worktree/command;includes-and-origin-visible', native:'needs-source-and-scope-audit', gui:'typed-settings-with-provenance-needed', secret:'never-export-values-of-sensitive-keys', evidence:'official-definition;not-runtime-or-write-proof'})), environment: current.environment.map(x=>({...x,valueCapture:false,gui:'operation-scoped-policy-or-capability;not-user-environment-dump'})), guides: current.guides, limitations: ['Documented option token extraction includes common reference fragments, not a semantic grammar for arbitrary argv.', 'Arbitrary external git-* programs, aliases, hooks and extensions have unknowable semantics and cannot be declared exhaustively implemented.', 'Installed binaries vary by OS and optional build components; source inventory does not prove shipped availability.', 'Configuration dynamic subsections and environment prefix families are schemas, not finite concrete key/value inventories.'] };
  if (lfsSource) {
    matrix.optionalLfs = [];
    for (const name of (await readdir(path.join(lfsSource,'docs/man'))).filter(x=>/^git-lfs(?:-[\w-]+)?\.adoc$/.test(x)).sort()) {
      const text = await readFile(path.join(lfsSource,'docs/man',name),'utf8');
      matrix.optionalLfs.push({name:path.basename(name,'.adoc'),reference:`docs/man/${name}`,options:[...new Set([...text.matchAll(/--[a-zA-Z][\w-]*/g)].map(x=>x[0]))].sort(),destination:'local-repositories/large-files',native:'optional-executable-detection-required',gui:'not-yet-audited',permission:'local-files;remote-LFS-server-and-lock-permissions-when-used',recovery:'migration-can-rewrite-history;pruned-content-and-unlocks-not-universally-recoverable',evidence:'official-reference;not-shipped-runtime-proof'});
    }
  }
  await writeFile(output, JSON.stringify(matrix,null,2)+'\n');
  console.log(JSON.stringify(matrix.counts));
}
