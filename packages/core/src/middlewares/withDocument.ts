import type { MediaTypeObject, OperationObject, ResponseObject } from 'openapi3-ts/oas31'
import type { Middleware } from '../context'
import { METADATA_KEYS, OperationDocumentBuilder } from './doc.helpers'

export type ResponseDocs = Record<number, { doc: Omit<ResponseObject, 'content'>; content: MediaTypeObject }>

/**
 * The Passthrough Middleware that inject document's metadata
 */
export const withDocument = (doc: OperationObject): Middleware => {
  const fn: Middleware = async (_ctx, next) => {
    await next()
  }
  // Define documents
  Reflect.defineMetadata(METADATA_KEYS.DOC_KEY, doc, fn)
  return fn
}

withDocument.builder = (baseDoc?: OperationObject): OperationDocumentBuilder => {
  return new OperationDocumentBuilder(baseDoc)
}
