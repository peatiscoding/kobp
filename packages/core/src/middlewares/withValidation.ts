import type { KobpServiceContext, Middleware } from '../context'
import type { zodToJsonSchema } from 'zod-to-json-schema'
import { ClientErrorCode, KobpError } from '../utils'
import { METADATA_KEYS, KobpParsable } from './doc.helpers'
import { Next } from 'koa'

// Check if zod-to-json-schema is installed
const z2js: typeof zodToJsonSchema = require('zod-to-json-schema')?.zodToJsonSchema
// schema extraction utils
const isZod = (o: any) => o?._def?.typeName === 'ZodObject'
const isAjv = (o: any) => Boolean(o?._ajv)

const extractSchema = <T>(spec: KobpParsable<T>): ['zod' | 'ajv', any] => {
  if (z2js && isZod(spec)) {
    const forDocuments = z2js(spec as any, {
      target: 'openApi3',
    })
    return ['zod', forDocuments]
  }
  if (isAjv(spec) && spec.schema) {
    return ['ajv', spec.schema]
  }
  return undefined
}

export const withValidation = <
  Q extends Record<string, any>,
  P extends Record<string, string | number>,
  B = any,
>(schemaSpec: {
  query?: KobpParsable<Q>
  params?: KobpParsable<P>
  body?: KobpParsable<B>
}): Middleware => {
  const fn = async (context: KobpServiceContext, next: Next) => {
    const query = context.query
    const params = context.params
    const body = context.request.body
    try {
      // validate them one-by-one [Params => Query => Body]
      schemaSpec.params?.parse(params)
      schemaSpec.query?.parse(query)
      schemaSpec.body?.parse(body)
    } catch (err) {
      throw KobpError.fromUserInput(ClientErrorCode.badRequest, (err as Error).message)
    }
    await next()
  }

  for (const key of ['params', 'query', 'body']) {
    const spec: any = schemaSpec[key]
    if (!spec) continue
    const [source, schema] = extractSchema(spec)
    console.log(`defining ${key} schema::`, source, schema)
    // save this to internal storage against its function.
    Reflect.defineMetadata(METADATA_KEYS[`DOC_${key.toUpperCase()}_SHAPE_VALIDATION_KEY`], schema, fn)
  }
  return fn
}
