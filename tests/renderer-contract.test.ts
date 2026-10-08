import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('renderer connects to structured bridge and operation stream', () => { const app = source('src/renderer/app.ts'); for (const boundary of ['window.material.bootstrap()', 'window.material.execute({', 'window.material.onOperation(', 'window.material.cancel(', 'window.material.choices('])
    assert.ok(app.includes(boundary), boundary); assert.ok(!app.includes('execSync')); assert.ok(!app.includes('innerHTML')); });
test('official Material package and registered compositions form renderer', () => { assert.match(source('src/renderer/material.ts'), /import '@material\/web\/all.js'/); const components = source('src/renderer/components.ts'); for (const tag of ['mg-surface', 'mg-text', 'mg-layout', 'mg-search'])
    assert.ok(components.includes(`customElements.define('${tag}'`)); });
test('destructive review retains independent boundaries', () => { const app = source('src/renderer/app.ts').replace(/\s+/g, ''); assert.ok(app.includes('!this.keyOne||!this.keyTwo||this.confirmation!==100')); assert.ok(app.includes('(this.selected.mutation||this.selected.destructive)&&!confirmed')); assert.ok(app.includes("option.type==='secret')?'[redacted]'")); });
test('reduced motion and honest provenance are retained', () => { assert.match(source('src/renderer/styles.css'), /prefers-reduced-motion:reduce/); assert.ok(source('src/renderer/app.ts').includes('build provenance unavailable')); assert.match(source('design/material-provenance.md'), /do not establish real graphical interaction/); });

test('Material control tags have paired template boundaries',()=>{
    const app=source('src/renderer/app.ts');
    const tags=new Set([...app.matchAll(/<\/?(md-[a-z-]+)\b/g)].map(match=>match[1]));
    for(const tag of tags){
        const opens=[...app.matchAll(new RegExp(`<${tag}(?=[\\s>])`,'g'))].length;
        const closes=[...app.matchAll(new RegExp(`</${tag}>`,'g'))].length;
        assert.equal(opens,closes,`${tag} template opening and closing boundaries`);
    }
});
test('execution context, tab drafts, and persistent error paths stay explicit',()=>{
    const app=source('src/renderer/app.ts').replace(/\s+/g,'');
    assert.ok(app.includes("repository:this.selected.options.some(option=>option.name==='repo')?"));
    assert.ok(app.includes('this.values.json='));
    assert.ok(app.includes('this.drafts.get(command.id)'));
    assert.ok(app.includes("this.drafts.get(id)?.dirty&&!discard"));
    assert.ok(app.includes('if(!persistent)this.notificationTimer='));
    assert.ok(app.includes('restoreAppearance(this)'));
    assert.ok(app.includes('?disabled=${!this.keyOne||!this.keyTwo}'));
});
