import {readdir, readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

export async function documentationInventory(root = 'docs') {
  const result = [];
  async function walk(directory) {
    for (const file of await readdir(directory, {withFileTypes: true})) {
      const filename = path.join(directory, file.name);
      if (file.isDirectory()) await walk(filename);
      else if (file.name.endsWith('.md')) {
        const body = await readFile(filename, 'utf8');
        result.push({id: path.relative(root, filename).replaceAll('\\', '/'), title: body.match(/^#\s+(.+)$/m)?.[1] || file.name});
      }
    }
  }
  await walk(root);
  return result.sort((a, b) => a.id.localeCompare(b.id));
}

// Vite's eager raw imports become strings and an object mapping source paths to
// those strings. Decode JS syntax rather than searching escaped source bytes.
export function decodedDocumentationEntries(javascript) {
  const source = ts.createSourceFile('bundle.js', javascript, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (source.parseDiagnostics.length) throw Error('Cannot parse offline documentation JavaScript bundle');
  const bindings = new Map();
  const objects = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) bindings.set(node.name.text, node.initializer);
    if (ts.isObjectLiteralExpression(node)) objects.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  function decode(node, seen = new Set()) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isParenthesizedExpression(node)) return decode(node.expression, seen);
    if (ts.isIdentifier(node) && bindings.has(node.text) && !seen.has(node.text)) {
      const next = new Set(seen); next.add(node.text);
      if (next.size <= 32) return decode(bindings.get(node.text), next);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = decode(node.left, seen), right = decode(node.right, seen);
      if (left !== undefined && right !== undefined) return left + right;
    }
    return undefined;
  }
  const entries = new Map();
  for (const object of objects) for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name)) continue;
    const key = property.name.text.replaceAll('\\', '/');
    const body = decode(property.initializer);
    if (key.endsWith('.md') && body !== undefined) {
      const id = key.includes('/docs/') ? key.slice(key.lastIndexOf('/docs/') + 6) : key;
      const values = entries.get(id) || new Set(); values.add(body); entries.set(id, values);
    }
  }
  return entries;
}

export async function verifyDocumentationBundle(dist = 'dist/renderer', source = 'docs') {
  const inventory = await documentationInventory(source);
  const files = await readdir(path.join(dist, 'assets'));
  const maps = await Promise.all(files.filter(file => file.endsWith('.js')).map(async file => decodedDocumentationEntries(await readFile(path.join(dist, 'assets', file), 'utf8'))));
  const missing = [];
  for (const article of inventory) {
    const body = await readFile(path.join(source, article.id), 'utf8');
    if (!maps.some(entries => entries.get(article.id)?.has(body))) missing.push(article.id);
  }
  if (missing.length) throw Error(`Offline documentation bundle is missing or has altered articles: ${missing.join(', ')}`);
  await mkdir(dist, {recursive: true});
  await writeFile(path.join(dist, 'documentation-inventory.json'), JSON.stringify({version: 1, count: inventory.length, articles: inventory}, null, 2));
  return inventory;
}
