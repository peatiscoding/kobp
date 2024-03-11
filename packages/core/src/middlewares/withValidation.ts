import type { KobpServiceContext, Middleware } from '../context'
import { ClientErrorCode, KobpError } from '../utils'
import { METADATA_KEYS, KobpParsable, extractSchema } from './doc.helpers'
import { Next } from 'koa'

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
    const query = context.query
    const params = context.params
    const body = context.request.body
    const headers = context.request.headers
    // validate them one-by-one [Params => Query => Body]
    const inputs = [headers, query, params, body]
    const keys = ['headers', 'query', 'params', 'body'] as const
    for (let i = 0; i < inputs.length; i++) {
      const locationKey = keys[i]
      const input = inputs[i]
      try {
        schemaSpec[locationKey]?.parse(input)
      } catch (err) {
        console.error(`Input Validation error!`, err)
        // try construct the useful message
        let errorMessage = `${err?.errorMessage || err?.message || err}`
        // Identify the path based on 2 libraries (ajv-ts, zod)
        // ZodError
        const zodIssues: { path: string[]; message: string }[] = err.issues
        // AJV-ts error
        const ajvErrorPath = err.cause?.error?.instancePath || null
        if (zodIssues) {
          errorMessage = zodIssues
            .map((issue) => {
              return `${issue.path.join('.')} ${issue.message}`
            })
            .join(', ')
        } else if (ajvErrorPath) {
          // TODO:Format the path
          errorMessage = `Input error on: ${ajvErrorPath} ${errorMessage}`
        }
        throw KobpError.fromUserInput(ClientErrorCode.badRequest, errorMessage)
      }
    }
    await next()
  }

  for (const key of ['headers', 'params', 'query', 'body']) {
    const spec: any = schemaSpec[key]
    if (!spec) continue
    const [source, schema] = extractSchema(spec)
    console.log(`defining ${key} schema::`, source, schema)
    // save this to internal storage against its function.
    Reflect.defineMetadata(METADATA_KEYS[`DOC_${key.toUpperCase()}_SHAPE_VALIDATION_KEY`], schema, fn)
  }
  return fn
}
