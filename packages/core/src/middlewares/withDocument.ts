import type { MediaTypeObject, OperationObject, ResponseObject } from 'openapi3-ts/oas31'
import { Middleware } from '../context'

export const METADATA_DOC_KEY = 'document'

export type ResponseDocs = Record<number, { doc: Omit<ResponseObject, 'content'>; content: MediaTypeObject }>

export class OperationDocumentBuilder {
  private doc: OperationObject
  constructor(baseDoc?: OperationObject) {
    this.doc = { ...(baseDoc || {}) }
  }

  summary(summary: string): this {
    this.doc.summary = summary
    return this
  }

  onSuccess(content?: MediaTypeObject): this {
    return this.onResponse(
      200,
      {
        description: 'Successful',
      },
      content,
    )
  }

  onBadRequest(content?: MediaTypeObject): this {
    return this.onResponse(400, { description: 'Bad Request' }, content)
  }

  onResponse(status: number, doc: ResponseObject, content?: MediaTypeObject): this {
    this.doc.responses = this.doc.responses || {}
    this.doc.responses[status] = { ...doc }
    if (content) {
      this.doc.responses[status].content = {
        'application/json': content,
      }
    }
    return this
  }

  build(): Middleware {
    return withDocument(this.doc)
  }
}

export const withDocumentBuilder = (baseDoc: OperationObject): OperationDocumentBuilder => {
  return new OperationDocumentBuilder(baseDoc)
}

/**
 * The Passthrough Middleware that inject document's metadata
 */
export const withDocument = (doc: OperationObject): Middleware => {
  const fn: Middleware = async (ctx, next) => {
    await next()
  }
  // Define documents
  Reflect.defineMetadata(METADATA_DOC_KEY, doc, fn)
  return fn
}
