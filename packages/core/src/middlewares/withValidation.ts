import type { KobpServiceContext, Middleware } from '../context'
import type { Next } from 'koa'
import { ClientErrorCode, KobpError, Loggy } from '../utils'
import { METADATA_KEYS, KobpParsable, extractSchema } from './doc.helpers'

/**
 * This will mutates the inputs
 * `query` will mutates context.query
 * `params` will mutates context.params
 * `body` will mutates context.body
 * `headers` will mutates context.headers
 */
export const withValidation = <
  Q extends Record<string, string>,
  P extends Record<string, string>,
  H extends Record<string, string>,
  B = any,
>(schemaSpec: {
  query?: KobpParsable<Q>
  params?: KobpParsable<P>
  body?: KobpParsable<B>
  headers?: KobpParsable<H>
}): Middleware => {
  const fn = async (context: KobpServiceContext, next: Next) => {
    // validate them one-by-one [Params => Query => Body]
    const keys = ['headers', 'query', 'params', 'body'] as const
    for (const locationKey of keys) {
      const spec = schemaSpec[locationKey]
      if (!spec) {
        continue
      }
      try {
        switch (locationKey) {
          case 'query':
            context.query = spec.parse(context.query) as any
            break
          case 'params':
            context.params = spec.parse(context.params) as any
            break
          case 'body':
            context.request.body = spec.parse(context.request.body) as any
            break
          case 'headers':
            context.request.headers = spec.parse(context.request.headers) as any
            break
        }
      } catch (err) {
        Loggy.error(`Validation error: "${err}"`, err)
        // try construct the useful message
        let errorMessage = `${err?.errorMessage || err?.message || err}`
        // Identify the path based on 2 libraries (ajv-ts, zod)
        // ZodError
        const zodIssues: { path: string[]; message: string }[] = err.issues
        // AJV-ts error
        const ajvErrorPath = err.cause?.error?.instancePath || null
        let orgSchemaValidationData = {}
        if (zodIssues) {
          errorMessage = zodIssues
            .map((issue) => {
              return `${[locationKey, ...issue.path].join('.')} ${issue.message}`
            })
            .join(', ')
          orgSchemaValidationData = zodIssues
        } else if (ajvErrorPath) {
          const path = ajvErrorPath.replace(/^\//, `${locationKey}.`).replaceAll('/', '.')
          errorMessage = `Input error on: ${path} ${errorMessage}`
          orgSchemaValidationData = err.cause || {}
        }
        throw KobpError.fromUserInput(ClientErrorCode.badRequest, errorMessage, orgSchemaValidationData)
      }
    }
    await next()
  }

  // This should print only once.
  for (const key of ['headers', 'params', 'query', 'body']) {
    const spec: any = schemaSpec[key]
    if (!spec) continue
    const [_source, schema] = extractSchema(spec)
    // console.log(`defined ${key} schema::`, source, schema)
    // save this to internal storage against its function.
    Reflect.defineMetadata(METADATA_KEYS[`DOC_${key.toUpperCase()}_SHAPE_VALIDATION_KEY`], schema, fn)
  }
  return fn
}
