import type { OperationObject } from 'openapi3-ts/oas31'
import { Middleware } from '../context'

export const METADATA_DOC_KEY = 'document'

/**
 * The Passthrough Middleware that inject document's metadata
 */
export const withDocument = (docArgs: OperationObject): Middleware => {
  const fn: Middleware = async (ctx, next) => {
    await next()
  }
  // Define documents
  Reflect.defineMetadata(METADATA_DOC_KEY, docArgs, fn)
  return fn
}
