/** Real Chromium integration checks; run: node tests/scroll-surface.browser.mjs */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const result = await build({ entryPoints: ['src/renderer/scroll-surface.ts'], bundle: true, format: 'iife', globalName: 'ScrollComposition', write: false });
const browser = await chromium.launch({ headless: true, ...(existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}) });
try {
    const page = await browser.newPage();
    await page.setContent('<div style="height:200px;width:300px;display:flex"><mg-scroll label="Test activity" style="flex:1"><div id="content" style="height:800px;width:900px">Activity</div></mg-scroll></div>');
    await page.addScriptTag({ content: result.outputFiles[0].text });
    await page.waitForFunction(() => document.querySelector('mg-scroll').shadowRoot.querySelector('.vertical').getAttribute('aria-valuemax') === '614');
    const metrics = await page.evaluate(() => {
        const s = document.querySelector('mg-scroll'), v = s.viewport;
        return { h: v.clientHeight, w: v.clientWidth, maxY: v.scrollHeight - v.clientHeight, maxX: v.scrollWidth - v.clientWidth, hidden: getComputedStyle(v).scrollbarWidth };
    });
    assert.deepEqual(metrics, { h: 186, w: 286, maxY: 614, maxX: 614, hidden: 'none' });
    const vertical = page.locator('mg-scroll').locator('.vertical');
    const horizontal = page.locator('mg-scroll').locator('.horizontal');
    await vertical.focus(); await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.querySelector('mg-scroll').viewport.scrollTop), 614);
    await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.querySelector('mg-scroll').viewport.scrollTop), 40);
    await page.keyboard.press('PageDown');
    assert.equal(await page.evaluate(() => document.querySelector('mg-scroll').viewport.scrollTop), 226);
    await horizontal.focus(); await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.querySelector('mg-scroll').viewport.scrollLeft), 614);
    await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.querySelector('mg-scroll').viewport.scrollLeft), 40);
    await vertical.focus(); await page.keyboard.press('Home');
    const thumb = await vertical.locator('.thumb').boundingBox();
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
    await page.mouse.down(); await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2 + 60); await page.mouse.up();
    assert.ok(await page.evaluate(() => document.querySelector('mg-scroll').viewport.scrollTop) > 200);
    await vertical.focus(); await page.keyboard.press('Home');
    const track = await vertical.boundingBox();
    await page.mouse.click(track.x + track.width / 2, track.y + track.height - 4);
    assert.equal(await page.evaluate(() => document.querySelector('mg-scroll').viewport.scrollTop), 186);
    // Native API, accessibility synchronization, and growth under a fixed wrapper.
    await page.evaluate(() => { const s = document.querySelector('mg-scroll'); s.viewport.scrollTop = 300; });
    await page.waitForFunction(() => document.querySelector('mg-scroll').shadowRoot.querySelector('.vertical').getAttribute('aria-valuenow') === '300');
    await page.evaluate(() => { const c = document.querySelector('#content'); c.style.cssText = 'height:20px;width:20px'; });
    await page.waitForFunction(() => [...document.querySelector('mg-scroll').shadowRoot.querySelectorAll('.track')].every(t => t.hidden));
    assert.equal(await page.evaluate(() => document.querySelector('mg-scroll').viewport.clientHeight), 200);
    await page.evaluate(() => { document.querySelector('#content').innerHTML = '<div style="height:1100px;width:1200px"></div>'; });
    await page.waitForFunction(() => document.querySelector('mg-scroll').shadowRoot.querySelector('.vertical').getAttribute('aria-valuemax') === '914');
    // Browser top-layer builders escape the overflow composition boundary.
    await page.evaluate(() => {
        const builder = document.createElement('div'); builder.id = 'test-builder';
        builder.setAttribute('popover', 'manual');
        builder.style.cssText = 'position:fixed;inset:auto;left:400px;top:20px;width:100px;height:100px;margin:0';
        document.querySelector('#content').append(builder); builder.showPopover();
    });
    assert.equal(await page.evaluate(() => document.elementFromPoint(450, 60)?.id), 'test-builder');
    await page.evaluate(() => document.querySelector('#test-builder').remove());
    // Installer follows initial and late attached open roots and removes its rules.
    await page.evaluate(() => {
        window.disposeScrollStyles = ScrollComposition.installNativeScrollbarStyles();
        const host = document.createElement('test-scroll-host'); document.body.append(host);
        host.attachShadow({ mode: 'open' }).innerHTML = '<div style="overflow:auto;height:20px">Example</div>';
    });
    await page.waitForFunction(() => !!document.querySelector('test-scroll-host').shadowRoot.querySelector('style[data-mg-native-scrollbars]'));
    assert.equal(await page.evaluate(() => !!document.querySelector('mg-scroll').shadowRoot.querySelector('style[data-mg-native-scrollbars]')), false);
    await page.evaluate(() => window.disposeScrollStyles());
    assert.equal(await page.evaluate(() => document.querySelectorAll('style[data-mg-native-scrollbars]').length), 0);
    assert.equal(await page.evaluate(() => document.querySelector('test-scroll-host').shadowRoot.querySelectorAll('style[data-mg-native-scrollbars]').length), 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await vertical.locator('.thumb').evaluate(t => getComputedStyle(t).transitionDuration), '0s');
    console.log('Scroll browser checks passed: layout, both axes, keys, drag, track, ARIA, content observers, native shadow fallback, cleanup, reduced motion.');
} finally { await browser.close(); }
