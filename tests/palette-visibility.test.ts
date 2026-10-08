import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPaletteHidden } from '../src/renderer/palette-visibility.js';

function element(parent: Element | null = null, host?: Element, attributes: Record<string,string> = {}, name = 'button'): Element {
 return {parentElement:parent,localName:name,hasAttribute:(key:string)=>key in attributes,getAttribute:(key:string)=>attributes[key]??null,getRootNode:()=>({host})} as unknown as Element;
}
test('palette excludes inactive tabs across nested shadow hosts',()=>{
 const inactive=element(null,undefined,{hidden:''});
 const surface=element(inactive);
 const nestedHost=element(null,surface);
 assert.equal(isPaletteHidden(element(null,nestedHost)),true);
 const active=element();
 assert.equal(isPaletteHidden(element(null,element(active))),false);
});
test('palette excludes its own shadow controls and accessibility-hidden parents',()=>{
 assert.equal(isPaletteHidden(element(null,element(null,undefined,{},'mg-workspace-palette'))),true);
 assert.equal(isPaletteHidden(element(element(null,undefined,{'aria-hidden':'true'}))),true);
});
