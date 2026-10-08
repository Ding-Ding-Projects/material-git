import type {ApiJson, ApiResult, GraphqlRequest, GraphqlSelection, GraphqlTypeSummary} from '../shared/github-api';

export type DescribeGraphqlType = (name: string) => GraphqlTypeSummary;
const maxSelections = 512, maxDepth = 16;
const typeName = (type: string) => type.replace(/[\[\]!]/g, '');
const key = (selection: GraphqlSelection) => selection.alias || selection.field || '';
function bounded(request: GraphqlRequest): boolean {
  let count = 0;
  function visit(items: GraphqlSelection[], depth: number): boolean {
    return depth <= maxDepth && items.every(item => ++count <= maxSelections && (!item.selections || visit(item.selections, depth + 1)));
  }
  return visit(request.selections, 0);
}
function object(value: ApiJson | undefined): Record<string, ApiJson> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

/** Add forward pagination metadata only to connections supported by the schema. */
export function prepareGraphqlPagination(request: GraphqlRequest, describe: DescribeGraphqlType, queryType = 'Query'): GraphqlRequest {
  if (!bounded(request)) throw new Error('GraphQL selections exceed the pagination limit.');
  const prepared = structuredClone(request);
  if (prepared.operation !== 'query') return prepared;
  function lookup(name: string): GraphqlTypeSummary | undefined {try {return describe(name);} catch {return undefined;}}
  function visit(items: GraphqlSelection[], parent: string): void {
    const fields = lookup(parent)?.fields;
    for (const selection of items) {
      if (selection.onType) {visit(selection.selections || [], selection.onType); continue;}
      const field = fields?.find(item => item.name === selection.field);
      if (!field) continue;
      const output = lookup(typeName(field.type));
      const pageInfo = output?.fields?.find(item => item.name === 'pageInfo');
      const infoFields = pageInfo && lookup(typeName(pageInfo.type))?.fields;
      if (selection.selections && field.args.some(arg => arg.name === 'first') && field.args.some(arg => arg.name === 'after')
        && infoFields?.some(item => item.name === 'hasNextPage') && infoFields.some(item => item.name === 'endCursor')
        && !Object.hasOwn(selection.args || {}, 'last') && !Object.hasOwn(selection.args || {}, 'before')) {
        selection.args = {...selection.args, first: selection.args?.first ?? 100};
        let info = selection.selections.find(item => item.field === 'pageInfo');
        if (!info) {info = {field: 'pageInfo', selections: []}; selection.selections.push(info);}
        info.selections ||= [];
        for (const name of ['hasNextPage', 'endCursor']) if (!info.selections.some(item => item.field === name)) info.selections.push({field: name});
      }
      if (selection.selections) visit(selection.selections, typeName(field.type));
    }
  }
  visit(prepared.selections, queryType);
  if (!bounded(prepared)) throw new Error('GraphQL selections exceed the pagination limit.');
  return prepared;
}

/** Derive one safe next query from the returned GraphQL data envelope. */
export function nextGraphqlPage(request: GraphqlRequest, result: ApiResult): GraphqlRequest | undefined {
  if (request.operation !== 'query' || !bounded(request) || !result.ok || result.truncated || result.partial) return undefined;
  const envelope = object(result.data), data = object(envelope?.data);
  if (!data || (Array.isArray(envelope?.errors) && envelope.errors.length)) return undefined;
  const next = structuredClone(request);
  const candidates: {selection: GraphqlSelection; cursor: string}[] = [];
  let invalid = false, visits = 0;
  const occurrences = new Map<GraphqlSelection, number>();
  function visit(items: GraphqlSelection[], value: ApiJson | undefined, depth: number): void {
    if (++visits > 4096 || depth > maxDepth) {invalid = true; return;}
    if (Array.isArray(value)) {for (const item of value) visit(items, item, depth + 1); return;}
    const row = object(value);
    if (!row) return;
    for (const selection of items) {
      if (selection.onType) {visit(selection.selections || [], row, depth + 1); continue;}
      const child = row[key(selection)];
      const info = selection.selections?.find(item => item.field === 'pageInfo');
      const first = selection.args?.first;
      if (info && Number.isInteger(first) && typeof first === 'number' && first >= 1 && first <= 100
        && !Object.hasOwn(selection.args || {}, 'last') && !Object.hasOwn(selection.args || {}, 'before')) {
        occurrences.set(selection, (occurrences.get(selection) || 0) + 1);
        const infoObject = object(object(child)?.[key(info)]);
        const hasNext = info.selections?.find(item => item.field === 'hasNextPage');
        const endCursor = info.selections?.find(item => item.field === 'endCursor');
        const hasMore = hasNext && infoObject?.[key(hasNext)];
        const cursor = endCursor && infoObject?.[key(endCursor)];
        if (hasMore !== true && hasMore !== false) invalid = true;
        if (hasMore === true) {
          if (typeof cursor !== 'string' || !cursor.trim() || cursor.length > 8192 || /[\x00-\x1f\x7f]/.test(cursor) || cursor === selection.args?.after) invalid = true;
          else candidates.push({selection, cursor});
        }
      }
      if (selection.selections) visit(selection.selections, child, depth + 1);
    }
  }
  visit(next.selections, data, 0);
  if (invalid || candidates.length !== 1 || [...occurrences.values()].some(count => count > 1)) return undefined;
  const {selection, cursor} = candidates[0];
  selection.args = {...selection.args, after: cursor};
  return next;
}
