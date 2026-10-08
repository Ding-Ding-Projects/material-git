/** Pure schema form helpers. Values remain typed; omission differs from false, zero and null. */
export interface FormSchema {
  type?: string | string[]; title?: string; description?: string; format?: string;
  enum?: unknown[]; enumDescriptions?: Record<string,string>; const?: unknown; uniqueItems?: boolean; default?: unknown; example?: unknown; examples?: unknown[];
  properties?: Record<string, FormSchema>; required?: string[]; items?: FormSchema;
  additionalProperties?: boolean | FormSchema; oneOf?: FormSchema[]; anyOf?: FormSchema[];
  allOf?: FormSchema[]; minimum?: number; maximum?: number; minLength?: number;
  maxLength?: number; minItems?: number; maxItems?: number; pattern?: string;
  nullable?: boolean; readOnly?: boolean; writeOnly?: boolean; $ref?: string;
}
/** Resolve local OpenAPI references one level at a time so recursive objects expand lazily. */
export function resolveSchema(schema: FormSchema, references: Record<string, FormSchema>, seen = new Set<string>()): FormSchema {
  if (schema.$ref) {
    if (seen.has(schema.$ref)) return schema;
    const target = references[schema.$ref];
    if (!target) return schema;
    const next = new Set(seen).add(schema.$ref);
    return {...resolveSchema(target, references, next), ...Object.fromEntries(Object.entries(schema).filter(([key]) => key !== '$ref'))};
  }
  if (schema.allOf) {
    const parts = schema.allOf.map(item => resolveSchema(item, references, seen));
    return {...schema, ...Object.assign({}, ...parts), properties: Object.assign({}, ...parts.map(item => item.properties || {}), schema.properties || {}), required: [...new Set([...parts.flatMap(item => item.required || []), ...(schema.required || [])])], allOf: undefined};
  }
  return schema;
}

export function schemaType(schema: FormSchema): string {
  return (Array.isArray(schema.type) ? schema.type.find(type => type !== 'null') : schema.type)
    || (schema.properties || schema.required || schema.additionalProperties !== undefined ? 'object' : schema.items ? 'array' : 'json');
}
export function initialValue(schema: FormSchema, references: Record<string, FormSchema> = {}, seen = new Set<string>()): unknown {
  if (schema.$ref) {if(seen.has(schema.$ref))return undefined;seen=new Set(seen).add(schema.$ref);}
  schema=resolveSchema(schema,references);
  if (schema.default !== undefined) return structuredClone(schema.default);
  if (schemaType(schema) === 'object') {
    const value: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(schema.properties || {})) {
      if(child.readOnly)continue;
      const initial = initialValue(child,references,seen);
      if (initial !== undefined) value[key] = initial;
    }
    return Object.keys(value).length ? value : undefined;
  }
  return undefined;
}
export function validateValue(schema: FormSchema, value: unknown, required = false, path = 'Value', references: Record<string, FormSchema> = {}, depth = 0): string[] {
  if (depth > 64) return [`${path} exceeds the nested value limit.`];
  schema = resolveSchema(schema, references);
  if (schema.$ref && value !== undefined) return [`${path} uses an unavailable schema reference.`];
  if (value === undefined) return required ? [`${path} is required.`] : [];
  if (value === null && (schema.nullable || (Array.isArray(schema.type) && schema.type.includes('null')))) return [];
  const errors: string[] = [], type = schemaType(schema);
  if (schema.enum && !schema.enum.some(item => JSON.stringify(item) === JSON.stringify(value))) errors.push(`${path} must be one of the listed choices.`);
  if (schema.const !== undefined && JSON.stringify(schema.const) !== JSON.stringify(value)) errors.push(`${path} must use the schema constant.`);
  if (schema.oneOf || schema.anyOf) {
    const alternatives = schema.oneOf || schema.anyOf || [];
    const matches = alternatives.filter(option => !validateValue(option, value, required, path, references, depth + 1).length).length;
    if (!matches || (schema.oneOf && matches !== 1)) errors.push(`${path} must match ${schema.oneOf ? 'exactly one' : 'one'} permitted shape.`);
  }
  if (type === 'json') {
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return errors;
    if (Array.isArray(value)) return [...errors,...value.flatMap((item,index)=>validateValue({},item,true,`${path}[${index+1}]`,references,depth+1))];
    if (value && typeof value === 'object') return [...errors,...Object.entries(value).flatMap(([key,item])=>['__proto__','constructor','prototype'].includes(key)?[`${path}.${key} is unsafe.`]:validateValue({},item,true,`${path}.${key}`,references,depth+1))];
    return [...errors,`${path} must contain a JSON value.`];
  }
  if (value === null) return [...errors,`${path} cannot be null.`];
  if (type === 'object') {
    if (typeof value !== 'object' || Array.isArray(value)) return [...errors, `${path} must be an object.`];
    const object = value as Record<string, unknown>;
    for (const key of schema.required || []) if (object[key] === undefined) errors.push(`${path}.${key} is required.`);
    for (const [key, child] of Object.entries(schema.properties || {})) errors.push(...validateValue(child, object[key], schema.required?.includes(key), `${path}.${key}`, references, depth + 1));
    for (const [key, child] of Object.entries(object)) if (!Object.hasOwn(schema.properties || {}, key)) {
      if (schema.additionalProperties === false) errors.push(`${path}.${key} is not an allowed property.`);
      else if (typeof schema.additionalProperties === 'object') errors.push(...validateValue(schema.additionalProperties, child, false, `${path}.${key}`, references, depth + 1));
    }
  } else if (type === 'array') {
    if (!Array.isArray(value)) return [...errors, `${path} must be a list.`];
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} needs at least ${schema.minItems} items.`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} allows at most ${schema.maxItems} items.`);
    if (schema.uniqueItems && new Set(value.map(item=>JSON.stringify(item))).size !== value.length) errors.push(`${path} must contain unique items.`);
    value.forEach((item, index) => errors.push(...validateValue(schema.items || {}, item, true, `${path}[${index + 1}]`, references, depth + 1)));
  } else if (type === 'number' || type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (type === 'integer' && !Number.isInteger(value))) errors.push(`${path} must be ${type === 'integer' ? 'a whole' : 'a finite'} number.`);
    else {
      if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} must be at least ${schema.minimum}.`);
      if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} must be at most ${schema.maximum}.`);
    }
  } else if (type === 'boolean') {
    if (typeof value !== 'boolean') errors.push(`${path} must be on or off.`);
  } else if (typeof value !== 'string') errors.push(`${path} must be text.`);
  else {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} needs at least ${schema.minLength} characters.`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path} allows at most ${schema.maxLength} characters.`);
    // Provider expressions remain server-authoritative; never evaluate untrusted regexes here.
  }
  return errors;
}
const secretKey = /(?:authorization|cookie|password|token|secret|private[-_]?key|client[-_]?secret)/i;
export function redactPreview(value: unknown, key = ''): unknown {
  if (secretKey.test(key)) return '[redacted]';
  if (typeof value === 'string') return value.replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g, '[redacted]');
  if (Array.isArray(value)) return value.map(item => redactPreview(item, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, redactPreview(item, name)]));
  return value;
}

/** Required-only alternative branches add requirements without losing the common object properties. */
export function alternativeSchema(base:FormSchema,option:FormSchema):FormSchema {
 return {...base,...option,oneOf:undefined,anyOf:undefined,properties:{...base.properties,...option.properties},required:[...new Set([...(base.required||[]),...(option.required||[])])]};
}
export function jsonValueType(value:unknown):string {return value===null?'null':Array.isArray(value)?'array':typeof value==='object'?'object':typeof value==='boolean'?'boolean':typeof value==='number'?'number':'string';}
export function emptyTypedValue(type:string):unknown {return type==='null'?null:type==='object'?{}:type==='array'?[]:type==='boolean'?false:type==='number'||type==='integer'?0:'';}
