export interface DocumentationArticle {id: string; title: string}
export function documentationInventory(root?: string): Promise<DocumentationArticle[]>;
export function decodedDocumentationEntries(javascript: string): Map<string, Set<string>>;
export function verifyDocumentationBundle(dist?: string, source?: string): Promise<DocumentationArticle[]>;
