import type { KobpServiceContext, Middleware } from '../context'
import type { zodToJsonSchema } from 'zod-to-json-schema'
import { ClientErrorCode, KobpError } from '../utils'

/**
 * The general interface that fits `zod`, `ajv-ts`, +other for further support.
 */
export interface KobpParsable<T> {
  /**
   * A pure synchronus function that handles parsing
   * and ensure the given input object matches the required T Type
   * otherwise throws Error
   *
   * This function will ensure that;
   *
   * [1] context.query matches the T.query spec.
   * [2] context.body matches the T.body spec.
   * [3] context.params matches the T.params spec.
   *
   * @throws {Error} the message of the error will then be wrapped with KobpError
   */
  parse(object: any): T

  /**
   * Optionally it may be able to spit out schema here
   */
  schema?: any
}

// Check if zod-to-json-schema is installed
const z2js: typeof zodToJsonSchema = require('zod-to-json-schema')?.zodToJsonSchema
// schema extraction utils
const isZod = (o: any) => o?._def?.typeName === 'ZodObject'
const isAjv = (o: any) => Boolean(o?._ajv)

const extractSchema = <T>(spec: KobpParsable<T>): any => {
  if (z2js && isZod(spec)) {
    const forDocuments = z2js(spec as any, {
      target: 'openApi3',
    })
    return forDocuments
  }
  if (isAjv(spec) && spec.schema) {
    return spec.schema
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
  for (const key of ['params', 'query', 'body']) {
    const spec: any = schemaSpec[key]
    if (!spec) continue
    const schema = extractSchema(spec)
    console.log(`${key} schema`, schema)
  }

  return async (context: KobpServiceContext, next) => {
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
}
