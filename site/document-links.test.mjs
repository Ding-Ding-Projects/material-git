import test from 'node:test';
import assert from 'node:assert/strict';
import { documentationRoute, renderArticle } from './document-links.mjs';

const sources=new Set([
  'docs/start.md',
  'docs/next.md',
  'wiki/Home.md',
  'wiki/Next-Step.md',
]);

test('documentation links and heading fragments stay inside the local article routes',()=>{
  const html=renderArticle('# Start\n\n[Next](next.md#details)\n\n## Details\n\n[Jump to details](#details)','docs/start.md',sources);
  assert.ok(html.includes('href="#docs/next?section=details"'));
  assert.ok(html.includes('href="#docs/start?section=details"'));
  assert.ok(html.includes('<h2 id="details" tabindex="-1">Details</h2>'));
  assert.equal(documentationRoute('docs/next.md','details'),'#docs/next?section=details');
});

test('Wiki article routes preserve page identity, relative links, and anchors',()=>{
  const html=renderArticle('# Home\n\n[Next](Next-Step.md#policy)','wiki/Home.md',sources);
  assert.ok(html.includes('href="#docs/wiki%2FNext-Step?section=policy"'));
  assert.equal(documentationRoute('wiki/Home.md'),'#docs/wiki%2FHome');
});
