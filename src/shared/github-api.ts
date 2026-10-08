/** Official GitHub schema metadata and structured main-process API requests. */
export type ApiJson = null | boolean | number | string | ApiJson[] | {[key:string]:ApiJson};
export interface ApiSchema {[key:string]:unknown; $ref?:string; type?:string; enum?:ApiJson[]; properties?:Record<string,ApiSchema>; items?:ApiSchema; required?:string[]; description?:string; default?:ApiJson; oneOf?:ApiSchema[]; anyOf?:ApiSchema[]; allOf?:ApiSchema[];}
export interface ApiParameter {name:string; in:'path'|'query'|'header'|'cookie'; required?:boolean; description?:string; schema?:ApiSchema; style?:string; explode?:boolean;}
export interface ApiOperationSummary {operationId:string; method:string; path:string; server?:'api.github.com'|'uploads.github.com'; category:string; summary:string; description:string; documentationUrl?:string; deprecated:boolean; mutating:boolean; binary:boolean;}
export interface ApiOperation extends ApiOperationSummary {parameters:ApiParameter[]; requestBody?:{required?:boolean; description?:string; content:Record<string,{schema?:ApiSchema}>}; responses:Record<string,{description?:string; content?:Record<string,{schema?:ApiSchema}>; headers?:Record<string,unknown>}>;}
export interface ApiSource {url:string; commit:string; sha256:string; license:string;}
export interface ApiCatalogFile {version:1; sources:{rest:ApiSource; graphql:ApiSource}; restVersion:string; operations:ApiOperation[]; components:Record<string,unknown>; graphql:GraphqlTypeSummary[]; counts:{restOperations:number; restPaths:number; restCategories:number; graphqlTypes:number; graphqlFields:number; graphqlQueryFields:number; graphqlMutationFields:number;};}
export interface ApiCatalogRequest {query?:string; category?:string; page?:number; pageSize?:number;}
export interface ApiCatalogPage {operations:ApiOperationSummary[]; total:number; page:number; pageSize:number; categories:string[]; sources:ApiCatalogFile['sources']; counts:ApiCatalogFile['counts'];}
export interface ApiOperationDescription extends ApiOperation {references:Record<string,ApiSchema>; referencesTruncated:boolean;}
export interface ApiRestRequest {operationId:string; path?:Record<string,ApiJson>; query?:Record<string,ApiJson>; headers?:Record<string,string>; body?:ApiJson; bodyFile?:string; contentType?:string; confirmed?:boolean; nextPage?:string;}
export interface ApiResult {ok:boolean; status:number; headers:Record<string,string>; data?:ApiJson; text:string; truncated:boolean; nextPage?:string; method:string; endpoint:string; binary?:boolean; exported?:boolean; /** GraphQL errors can coexist with returned data. Full errors remain in the response envelope. */ partial?:boolean;}
export interface GraphqlArgument {name:string; type:string; description:string; defaultValue?:ApiJson;}
export interface GraphqlField extends GraphqlArgument {args:GraphqlArgument[]; deprecated:boolean; deprecationReason?:string;}
export interface GraphqlTypeSummary {name:string; kind:'OBJECT'|'INTERFACE'|'UNION'|'INPUT_OBJECT'|'ENUM'|'SCALAR'; description:string; fields?:GraphqlField[]; inputFields?:GraphqlArgument[]; enumValues?:{name:string;description:string;deprecated:boolean}[]; possibleTypes?:string[];}
export interface GraphqlSelection {field?:string; alias?:string; args?:Record<string,ApiJson>; selections?:GraphqlSelection[]; onType?:string;}
export interface GraphqlRequest {operation:'query'|'mutation'; name?:string; selections:GraphqlSelection[]; confirmed?:boolean;}
export interface GraphqlBuildResult {document:string; operation:'query'|'mutation'; mutating:boolean;}
export interface GraphqlCatalogRequest {query?:string; kind?:string; page?:number; pageSize?:number;}
export interface GraphqlCatalogPage {types:GraphqlTypeSummary[]; total:number; page:number; pageSize:number; queryType:string; mutationType:string|null; sources:ApiCatalogFile['sources']; counts:ApiCatalogFile['counts'];}
export interface GitHubApiBridge {
 catalogue(request?:ApiCatalogRequest):ApiCatalogPage;
 describe(operationId:string):ApiOperationDescription;
 execute(request:ApiRestRequest):Promise<ApiResult>;
 graphqlCatalogue(request?:GraphqlCatalogRequest):GraphqlCatalogPage;
 graphqlDescribe(name:string):GraphqlTypeSummary;
 graphqlBuild(request:GraphqlRequest):GraphqlBuildResult;
 graphqlExecute(request:GraphqlRequest):Promise<ApiResult>;
}
