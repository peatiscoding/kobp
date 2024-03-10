import {
  BaseParameterObject,
  MediaTypeObject,
  OperationObject,
  ParameterLocation,
  RequestBodyObject,
  ResponseObject,
} from 'openapi3-ts/oas31'
import { Middleware, withDocument } from '..'

export const METADATA_KEYS = {
  // compiled documents
  DOC_KEY: 'document',
  // - compiled query shape
  DOC_QUERY_SHAPE_KEY: 'document:query',
  // - compiled body shape
  DOC_BODY_SHAPE_KEY: 'document:body',
  // - compiled param shape
  DOC_PARAMS_SHAPE_KEY: 'document:param',
} as const

export const ALL_METADATA_KEYS = new Set(Object.values(METADATA_KEYS))

export class OperationDocumentBuilder {
  private doc: OperationObject
  protected wrapJsonResult: boolean = true

  constructor(baseDoc?: OperationObject) {
    // try extract documents from other sources
    this.doc = { ...(baseDoc || {}) }
  }

  summary(summary: string): this {
    this.doc.summary = summary
    return this
  }

  useHeader(map: Record<string, BaseParameterObject>): this
  useHeader(name: string, doc: BaseParameterObject): this
  useHeader(nameOrMap: string | Record<string, BaseParameterObject>, doc?: BaseParameterObject): this {
    return this.useParameter('header', nameOrMap, doc)
  }

  usePath(map: Record<string, BaseParameterObject>): this
  usePath(name: string, doc: BaseParameterObject): this
  usePath(nameOrMap: string | Record<string, BaseParameterObject>, doc?: BaseParameterObject): this {
    return this.useParameter('path', nameOrMap, doc)
  }

  useQuery(map: Record<string, BaseParameterObject>): this
  useQuery(name: string, doc: BaseParameterObject): this
  useQuery(nameOrMap: string | Record<string, BaseParameterObject>, doc?: BaseParameterObject): this {
    return this.useParameter('query', nameOrMap, doc)
  }

  useCookie(map: Record<string, BaseParameterObject>): this
  useCookie(name: string, doc: BaseParameterObject): this
  useCookie(nameOrMap: string | Record<string, BaseParameterObject>, doc?: BaseParameterObject): this {
    return this.useParameter('cookie', nameOrMap, doc)
  }

  useParameter(
    location: ParameterLocation,
    nameOrMap: string | Record<string, BaseParameterObject>,
    doc?: BaseParameterObject,
  ): this {
    // ensure parameter doc exists.
    this.doc.parameters = this.doc.parameters || []
    if (typeof nameOrMap === 'string') {
      this.doc.parameters.push({ ...doc, in: location, name: nameOrMap })
    } else {
      Object.entries(nameOrMap).forEach(([name, doc]) => {
        this.doc.parameters.push({ ...doc, in: location, name })
      })
    }
    return this
  }

  // used by swagger controller
  addParameter(location: ParameterLocation, name: string, doc: BaseParameterObject): this {
    const params = this.doc.parameters || []
    console.log('param', location, name, doc)
    params.push({ ...doc, in: location, name })
    this.doc.parameters = params
    return this
  }

  useBody(requestBody: RequestBodyObject): this {
    this.doc.requestBody = requestBody
    return this
  }

  /**
   * Server successfully processed the request
   */
  onOk(content?: MediaTypeObject): this {
    return this.onResponse(
      200,
      {
        description: 'Successful',
      },
      content,
    )
  }

  /**
   * Server accepted the request, payload is still being processed
   */
  onOkAccepted(): this {
    return this.onResponse(202, { description: 'Accepted' })
  }

  /**
   * Server successfully processed the request and is not returning any content
   */
  onOkNoContent(): this {
    return this.onResponse(204, { description: 'Successful without content' })
  }

  /**
   * Server rejected the request due to invalid user's input
   * TODO: Add other additional cases!, so that this method can call repeatedly and aggregates
   */
  onErrorBadRequest(contentOrMessage?: string | MediaTypeObject): this {
    if (typeof contentOrMessage === 'string') {
      return this.onResponse(
        400,
        { description: 'Bad request' },
        {
          schema: {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                default: contentOrMessage,
              },
            },
          },
        },
      )
    }
    return this.onResponse(400, { description: 'Bad Request' }, contentOrMessage)
  }

  onResponse(status: number, doc: ResponseObject, content?: MediaTypeObject): this {
    this.doc.responses = this.doc.responses || {}
    this.doc.responses[status] = { ...doc }
    if (content) {
      if (this.wrapJsonResult && content.schema) {
        if (status >= 200 && status < 400) {
          content = {
            ...content,
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  default: true,
                },
                data: content.schema,
              },
            },
          }
        } else {
          content = {
            ...content,
            schema: {
              allOf: [
                {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      default: false,
                    },
                    type: {
                      type: 'string',
                      default: 'kobp',
                    },
                  },
                },
                content.schema,
              ],
            },
          }
        }
      }
      this.doc.responses[status].content = {
        'application/json': content, // TODO: add wrapper?
        // TODO: Add other response types (Workaround, use withDocument)
      }
    }
    return this
  }

  build(): OperationObject {
    return this.doc
  }

  middleware(): Middleware {
    return withDocument(this.doc)
  }
}
