import type { KobpServiceContext, Middleware } from '../context'
import { ClientErrorCode, KobpError } from '../utils'
import { METADATA_KEYS, KobpParsable, extractSchema } from './doc.helpers'
import { Next } from 'koa'

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
