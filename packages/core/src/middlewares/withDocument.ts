import type { MediaTypeObject, OperationObject, ResponseObject } from 'openapi3-ts/oas31'
import type { Middleware } from '../context'
import { METADATA_KEYS, OperationDocumentBuilder } from './doc.helpers'

export type ResponseDocs = Record<number, { doc: Omit<ResponseObject, 'content'>; content: MediaTypeObject }>

export type OperationDocumentBuilderFn = (builder: OperationDocumentBuilder) => OperationDocumentBuilder

/**
 * The Passthrough Middleware that inject document's metadata
 */
export const withDocument = (doc: OperationObject | OperationDocumentBuilderFn): Middleware => {
  const fn: Middleware = async (_ctx, next) => {
    await next()
  }
  // Define documents
  const out = typeof doc === 'function' ? () => doc(new OperationDocumentBuilder()).build() : () => doc
  Reflect.defineMetadata(METADATA_KEYS.DOC_KEY, out, fn)
  return fn
}
