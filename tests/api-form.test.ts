import test from 'node:test';
import assert from 'node:assert/strict';
import {initialValue,resolveSchema,validateValue,redactPreview,alternativeSchema,emptyTypedValue} from '../src/renderer/api-form';

test('API forms preserve false and zero defaults without filling unrelated optional fields',()=>{
  const schema={type:'object',properties:{enabled:{type:'boolean',default:false},count:{type:'integer',default:0},name:{type:'string'}}};
  const value=initialValue(schema);
  assert.deepEqual(value,{enabled:false,count:0});
  assert.deepEqual(validateValue(schema,value,true),[]);
  assert.deepEqual(validateValue({type:'boolean'},undefined,true),['Value is required.']);
  assert.deepEqual(validateValue({type:'boolean'},false,true),[]);
});
test('Nested API schema validation follows local references and retains required properties',()=>{
  const references={'#/objects/item':{type:'object',required:['count'],properties:{count:{type:'integer',minimum:1}}}};
  const schema={type:'array',items:{$ref:'#/objects/item'},minItems:1};
  assert.deepEqual(validateValue(schema,[{count:2}],true,'Items',references),[]);
  assert.match(validateValue(schema,[{}],true,'Items',references).join('\n'),/Items\[1\]\.count is required/);
  assert.match(validateValue(schema,[{count:1.5}],true,'Items',references).join('\n'),/whole number/);
  assert.match(validateValue(schema,[],true,'Items',references).join('\n'),/at least 1 items/);
  assert.match(validateValue({$ref:'#/missing'},{},true).join('\n'),/unavailable schema reference/);
});
test('API oneOf, bounded numbers, enums and explicit null reject incorrect values',()=>{
  assert.equal(validateValue({oneOf:[{type:'number'},{type:'integer'}]},1,true).length,1);
  assert.deepEqual(validateValue({type:'string',nullable:true},null,true),[]);
  assert.equal(validateValue({type:'integer',minimum:1,maximum:100},101,true).length,1);
  assert.equal(validateValue({type:'string',enum:['open','closed']},'unknown',true).length,1);
  assert.equal(validateValue({type:'number'},Infinity,true).length,1);
  assert.equal(validateValue({type:'string',minLength:2},'',false).length,1);
});
test('Schema composition merges requirements and does not eagerly traverse recursive properties',()=>{
  const refs={'#/item':{type:'object',properties:{child:{$ref:'#/item'}}}};
  const resolved=resolveSchema({$ref:'#/item'},refs);
  assert.deepEqual(resolved.properties?.child,{$ref:'#/item'});
  const composition=resolveSchema({allOf:[{type:'object',required:['one'],properties:{one:{type:'boolean'}}},{type:'object',required:['two'],properties:{two:{type:'integer'}}}]},{});
  assert.deepEqual(composition.required,['one','two']);
  assert.deepEqual(validateValue(composition,{one:false,two:0},true),[]);
});
test('Request previews redact nested credential keys and provider token shapes without mutating drafts',()=>{
  const request={headers:{Authorization:'Bearer private-value'},body:{private_key:'private-key-value',nested:[{client_secret:'secret-value'}]},query:{text:'ghp_abcdefghijklmnopqrstuvwxyz',page:0}};
  const redacted=redactPreview(request) as typeof request;
  assert.equal(redacted.headers.Authorization,'[redacted]');
  assert.equal(redacted.body.private_key,'[redacted]');
  assert.equal(redacted.body.nested[0].client_secret,'[redacted]');
  assert.equal(redacted.query.text,'[redacted]');
  assert.equal(redacted.query.page,0);
  assert.equal(request.headers.Authorization,'Bearer private-value');
});

test('Required-only schema alternatives preserve common fields and enforce each branch like the backend',()=>{
 const schema={type:'object',properties:{type:{type:'string',enum:['Issue']},id:{type:'integer'},owner:{type:'string'},repo:{type:'string'},number:{type:'integer'}},required:['type'],additionalProperties:false,oneOf:[{required:['id']},{required:['owner','repo','number']}]};
 assert.deepEqual(validateValue(schema,{type:'Issue',id:3},true),[]);
 assert.deepEqual(validateValue(schema,{type:'Issue',owner:'owner',repo:'repo',number:3},true),[]);
 assert.match(validateValue(schema,{type:'Issue'},true).join(' '),/exactly one/);
 assert.match(validateValue(schema,{type:'Issue',id:3,owner:'owner',repo:'repo',number:3},true).join(' '),/exactly one/);
 assert.match(validateValue(schema,{type:'Invalid',id:3},true).join(' '),/listed choices/);
 assert.match(validateValue(schema,{type:'Issue',id:3,extra:true},true).join(' '),/allowed property/);
 assert.deepEqual(alternativeSchema(schema,schema.oneOf[1]).required,['type','owner','repo','number']);
 assert.equal(alternativeSchema(schema,schema.oneOf[1]).properties?.id.type,'integer');
});
test('Unspecified schema properties preserve each JSON type and reject nonfinite numbers and unsafe keys',()=>{
 const value={text:'',count:0,enabled:false,nested:{list:[null,2,{value:'text'}]}};
 assert.deepEqual(validateValue({type:'object',additionalProperties:{}},value,true),[]);
 for(const type of ['string','number','boolean','object','array','null'])assert.deepEqual(validateValue({},emptyTypedValue(type),true),[]);
 assert.match(validateValue({},Infinity,true).join(' '),/JSON value/);
 assert.match(validateValue({},JSON.parse('{"__proto__":0}'),true).join(' '),/unsafe/);
 assert.match(validateValue({type:'array',items:{type:'integer'},uniqueItems:true},[1,1],true).join(' '),/unique/);
});
