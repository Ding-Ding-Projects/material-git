import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Catalog } from '../shared/types';
export function loadCatalog(file = path.resolve('data/gh-catalog.json')): Catalog {
 const catalog = JSON.parse(readFileSync(file, 'utf8')) as Catalog;
 if(catalog.version !== '2.102.0' || !Array.isArray(catalog.commands)) throw new Error('Unsupported command catalog');
 return catalog;
}
