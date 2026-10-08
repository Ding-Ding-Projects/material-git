import test from 'node:test';
import assert from 'node:assert/strict';
import type {ApiJson, ApiResult, GraphqlRequest, GraphqlTypeSummary} from '../src/shared/github-api';
import {nextGraphqlPage, prepareGraphqlPagination} from '../src/renderer/api-pagination';
const field = (name: string, type: string, args: string[] = []) => ({name, type, description: '', deprecated: false, args: args.map(name => ({name, type: 'String', description: ''}))});
const schema: Record<string, GraphqlTypeSummary> = {
  Query: {name: 'Query', kind: 'OBJECT', description: '', fields: [field('repository', 'Repository')]},
  Repository: {name: 'Repository', kind: 'OBJECT', description: '', fields: [field('issues', 'IssueConnection!', ['first', 'after']), field('name', 'String')]},
  IssueConnection: {name: 'IssueConnection', kind: 'OBJECT', description: '', fields: [field('pageInfo', 'PageInfo!'), field('nodes', '[Issue!]!')]},
  PageInfo: {name: 'PageInfo', kind: 'OBJECT', description: '', fields: [field('hasNextPage', 'Boolean!'), field('endCursor', 'String')]},
};
const describe = (name: string) => schema[name];
const request: GraphqlRequest = {operation: 'query', selections: [{field: 'repository', alias: 'project', args: {owner: 'octocat', name: 'Hello-World'}, selections: [{field: 'issues', alias: 'tickets', args: {first: 20, states: ['OPEN']}, selections: [{field: 'nodes', selections: [{field: 'title'}]}]}]}]};
const result = (data: ApiJson): ApiResult => ({ok: true, status: 200, headers: {}, data, text: '', truncated: false, method: 'POST', endpoint: '/graphql'});
const response = (cursor: ApiJson = 'Y3Vyc29yOnYyOpHOAAAB', hasNextPage: ApiJson = true) => result({data: {project: {tickets: {nodes: [{title: 'Example issue'}], pageInfo: {hasNextPage, endCursor: cursor}}}}});
test('Schema preparation adds metadata and preserves typed arguments and the original draft', () => {
  const prepared = prepareGraphqlPagination(request, describe);
  assert.deepEqual(prepared.selections[0].selections?.[0].selections?.[1], {field: 'pageInfo', selections: [{field: 'hasNextPage'}, {field: 'endCursor'}]});
  assert.equal(request.selections[0].selections?.[0].selections?.length, 1);
  assert.deepEqual(prepareGraphqlPagination(prepared, describe), prepared);
  const draft = structuredClone(request); delete draft.selections[0].selections![0].args!.first;
  assert.equal(prepareGraphqlPagination(draft, describe).selections[0].selections?.[0].args?.first, 100);
  assert.deepEqual(prepareGraphqlPagination(request, () => ({name: 'Unknown', kind: 'OBJECT', description: ''})), request);
});
test('Actual GraphQL envelope and result aliases drive the next query', () => {
  const prepared = prepareGraphqlPagination(request, describe);
  const next = nextGraphqlPage(prepared, response());
  assert.deepEqual(next?.selections[0].selections?.[0].args, {first: 20, states: ['OPEN'], after: 'Y3Vyc29yOnYyOpHOAAAB'});
  assert.equal(prepared.selections[0].selections?.[0].args?.after, undefined);
  const info = prepared.selections[0].selections![0].selections![1];
  info.alias = 'paging'; info.selections![0].alias = 'more'; info.selections![1].alias = 'cursor';
  assert.ok(nextGraphqlPage(prepared, result({data: {project: {tickets: {paging: {more: true, cursor: 'next'}}}}})));
});
test('Mutations, malformed envelopes, unavailable metadata and unsafe cursors cannot repeat', () => {
  const prepared = prepareGraphqlPagination(request, describe);
  for (const cursor of [null, '', ' ', 123, {}, 'bad\nvalue', 'x'.repeat(8193)]) assert.equal(nextGraphqlPage(prepared, response(cursor)), undefined);
  for (const flag of [null, 'true', 1, false]) assert.equal(nextGraphqlPage(prepared, response('next', flag)), undefined);
  assert.equal(nextGraphqlPage(prepared, result({project: {tickets: {}}})), undefined);
  assert.equal(nextGraphqlPage(prepared, result({data: {project: {tickets: {}}}})), undefined);
  assert.equal(nextGraphqlPage({...prepared, operation: 'mutation'}, response()), undefined);
  assert.deepEqual(prepareGraphqlPagination({...request, operation: 'mutation'}, describe), {...request, operation: 'mutation'});
  for (const change of [{ok: false}, {partial: true}, {truncated: true}]) assert.equal(nextGraphqlPage(prepared, {...response(), ...change}), undefined);
  const repeated = nextGraphqlPage(prepared, response())!;
  assert.equal(nextGraphqlPage(repeated, response()), undefined);
  assert.equal(nextGraphqlPage(prepared, result({data: {}, errors: [{message: 'Failed'}]})), undefined);
});
test('Array connections and simultaneous next connections are ambiguous', () => {
  const prepared = prepareGraphqlPagination(request, describe);
  const row = {tickets: {pageInfo: {hasNextPage: true, endCursor: 'next'}}};
  assert.ok(nextGraphqlPage(prepared, result({data: {project: [row]}})));
  assert.equal(nextGraphqlPage(prepared, result({data: {project: [row, row]}})), undefined);
  prepared.selections[0].selections!.push({...structuredClone(prepared.selections[0].selections![0]), alias: 'others'});
  assert.equal(nextGraphqlPage(prepared, result({data: {project: {...row, others: row.tickets}}})), undefined);
});
test('Backward queries and excessive selections are bounded', () => {
  const draft = structuredClone(request); draft.selections[0].selections![0].args!.last = 20;
  assert.deepEqual(prepareGraphqlPagination(draft, describe), draft);
  const excessive: GraphqlRequest = {operation: 'query', selections: Array.from({length: 513}, () => ({field: 'name'}))};
  assert.throws(() => prepareGraphqlPagination(excessive, describe), /limit/);
  assert.equal(nextGraphqlPage(excessive, response()), undefined);
});
