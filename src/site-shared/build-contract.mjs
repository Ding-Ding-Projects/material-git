/** Exact documentation boundaries used by the builder and negative regression. */
export function validateDocumentationBundle(sourceFiles,articles){
 if(!Array.isArray(sourceFiles)||!sourceFiles.length||!Array.isArray(articles))throw Error('Documentation bundle is unavailable');
 const expected=new Set(sourceFiles);
 if(expected.size!==sourceFiles.length||articles.length!==expected.size)throw Error('Documentation count differs from source files');
 const actual=new Set();
 for(const article of articles){if(!article||typeof article.source!=='string'||!expected.has(article.source)||actual.has(article.source)||typeof article.title!=='string'||!article.title.trim()||typeof article.body!=='string'||!article.body.trim()||typeof article.html!=='string'||!article.html.trim()||article.id!==article.source.slice(5,-3))throw Error('Documentation article identity, body, title or rendered content is missing');actual.add(article.source)}
 for(const source of expected)if(!actual.has(source))throw Error('Source article is absent from bundle');
 return true;
}
