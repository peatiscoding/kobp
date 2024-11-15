import type {
  BaseParameterObject,
  MediaTypeObject,
  OperationObject,
  ParameterLocation,
  SchemaObject,
  RequestBodyObject,
  ResponseObject,
  ParameterObject,
} from 'openapi3-ts/oas31'

import { Middleware, withDocument, KobpError, ServerErrorCode, Loggy } from '..'

export const METADATA_KEYS = {
  // compiled documents
  DOC_KEY: 'document',
  // - compiled query shape
  DOC_HEADERS_SHAPE_VALIDATION_KEY: 'document:validate:headers',
  // - compiled query shape
  DOC_QUERY_SHAPE_VALIDATION_KEY: 'document:validate:query',
  // - compiled body shape
  DOC_BODY_SHAPE_VALIDATION_KEY: 'document:validate:body',
  // - compiled param shape
  DOC_PARAMS_SHAPE_VALIDATION_KEY: 'document:validate:param',
} as const

export const ALL_METADATA_KEYS = new Set(Object.values(METADATA_KEYS))

// Check if zod-to-json-schema is installed
const z2js = require('zod-to-json-schema')?.zodToJsonSchema
// schema extraction utils
const isZod = (o: any) => /^Zod/.test(`${o?._def?.typeName}`)
const isAjv = (o: any) => Boolean(o?._ajv)

/**
 * Attempt to extract schema from the SchemaObject | KobpParsable object
 *
 * NOTE: we are over simplify here as we believe that .schema would returns `OpenAPI31.SchemaObject` (or its compatible ones)
 */
export const extractSchema = (
  spec: SchemableObject,
  required: boolean = false,
  mode: 'read' | 'write' = 'read',
): ['zod' | 'ajv' | 'literal', SchemaObject] => {
  if (z2js && isZod(spec)) {
    const forDocuments: any = z2js(spec as any, {
      target: 'openApi3',
    })
    return ['zod', forDocuments]
  }
  if (isAjv(spec) && spec.schema) {
    return ['ajv', spec.schema]
  }
  if (mode === 'read' && spec.readonlySchema) {
    return ['literal', spec.readonlySchema]
  }
  if (spec.schema) {
    return ['literal', spec.schema]
  }
  if (required) {
    // Given
    Loggy.error('Failed to extract schema from', JSON.stringify(spec))
    throw KobpError.fromServer(
      ServerErrorCode.notImplemented,
      'You are using invalid schema provider. If you are using Zod, please install zod-to-json-schema (https://www.npmjs.com/package/zod-to-json-schema). If your are using other interface please make sure it has `schema` property that provides OpenAPI3.1 Schema compatible object!',
    )
  }
  return undefined
}

/**
 * The general interface that fits `ajv-ts` which allow us to use
 * its' schema injection for documentation purpose.
 *
 * We got zod to comply with this via the optional dependency (zod-to-json-schema)
 */
export interface SchemableObject {
  schema?: any
  /**
   * The alternative scheme that is used in readonly mode
   * useful when automatically generate an API document that emits readonly version
   */
  readonlySchema?: any
}

/**
 * The general interface that fits `zod`, `ajv-ts`, +other for further support.
 */
export interface KobpParsable<T> extends SchemableObject {
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
}

export class OperationDocumentBuilder {
  private doc: OperationObject
  protected wrapJsonResult: boolean = true

  constructor(baseDoc?: OperationObject) {
    // try extract documents from other sources
    this.doc = { ...(baseDoc || {}) }
  }

  /**
   * replace the current document
   */
  from(baseDoc: OperationObject): this {
    this.doc = { ...(baseDoc || {}) }
    return this
  }

  deprecated(deprecated: boolean): this {
    this.doc.deprecated = deprecated
    return this
  }

  describe(description: string): this {
    this.doc.description = description
    return this
  }

  summary(summary: string): this {
    this.doc.summary = summary
    return this
  }

  /**
   * Given authorization scheme MUST matched those defined in
   * the Swagger's controller (or Module's)
   *
   * @param {string} schemeName - name of the security handling example: 'bearer' | 'api-key' | 'basic'
   * @param {string[]} detail - detail of the security object
   */
  authorizeWith(schemeName: string, detail: string[] = []): this {
    this.doc.security = [{ [schemeName]: detail }]
    return this
  }

  useHeader(map: Record<string, BaseParameterObject>): this
  useHeader(name: string, doc: BaseParameterObject): this
  useHeader(nameOrMap: string | Record<string, BaseParameterObject>, doc?: BaseParameterObject): this {
    return this.useParameters('header', nameOrMap, doc)
  }

  usePath(map: Record<string, BaseParameterObject>): this
  usePath(name: string, doc: BaseParameterObject): this
  usePath(nameOrMap: string | Record<string, BaseParameterObject>, doc?: BaseParameterObject): this {
    return this.useParameters('path', nameOrMap, doc)
  }

  useQuery(map: Record<string, BaseParameterObject>): this
  useQuery(name: string, doc: BaseParameterObject): this
  useQuery(nameOrMap: string | Record<string, BaseParameterObject>, doc?: BaseParameterObject): this {
    return this.useParameters('query', nameOrMap, doc)
  }

  useCookie(map: Record<string, BaseParameterObject>): this
  useCookie(name: string, doc: BaseParameterObject): this
  useCookie(nameOrMap: string | Record<string, BaseParameterObject>, doc?: BaseParameterObject): this {
    return this.useParameters('cookie', nameOrMap, doc)
  }

  useParameters(
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
  useParameter(location: ParameterLocation, name: string, doc: BaseParameterObject): this {
    const params = (this.doc.parameters || []) as ParameterObject[]
    // safe push
    if (params.findIndex((p) => p.name === name && p.in === location) >= 0) {
      return this
    }
    params.push({ ...doc, in: location, name })
    this.doc.parameters = params
    return this
  }

  /**
   * This method will override the validation body's middleware injection if used.
   */
  useBody(requestBody: RequestBodyObject): this {
    this.doc.requestBody = requestBody
    return this
  }

  /**
   * Server successfully processed the request
   */
  onOk(schema?: any, rest?: Omit<MediaTypeObject, 'schema'>): this {
    return this.onResponse(
      200,
      {
        description: 'Successful',
      },
      schema
        ? {
            schema: extractSchema(schema, true)[1],
            ...rest,
          }
        : rest,
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
   */
  onErrorBadRequest(contentOrMessage?: string | MediaTypeObject): this {
    return this.onErrorResponse(400, 'Bad request', contentOrMessage)
  }

  onErrorUnauthorized(contentOrMessage?: string | MediaTypeObject): this {
    return this.onErrorResponse(401, 'Unauthorized', contentOrMessage)
  }

  onErrorForbidden(contentOrMessage?: string | MediaTypeObject): this {
    return this.onErrorResponse(403, 'Forbidden', contentOrMessage)
  }

  onErrorNotFound(contentOrMessage?: string | MediaTypeObject): this {
    return this.onErrorResponse(404, 'Resource not found', contentOrMessage)
  }

  onErrorInternal(contentOrMessage?: string | MediaTypeObject): this {
    return this.onErrorResponse(500, 'Internal server error', contentOrMessage)
  }

  onErrorResponse(status: number, defaultMessage: string, contentOrMessage?: string | MediaTypeObject): this {
    if (typeof contentOrMessage === 'string') {
      return this.onResponse(
        status,
        { description: defaultMessage },
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
    return this.onResponse(status, { description: defaultMessage }, contentOrMessage)
  }

  onResponse(status: number, doc: ResponseObject, content?: MediaTypeObject): this {
    this.doc.responses = this.doc.responses || {}
    this.doc.responses[status] = { ...doc }
    if (content) {
      if (this.wrapJsonResult && content.schema) {
        if (status >= 200 && status < 400) {
          // Success case
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
          // Error case
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

  /**
   * useful for swagger controller to access the output document directly
   *
   * @returns {OperationObject} OpenAPI operation object
   */
  build(): OperationObject {
    return this.doc
  }

  middleware(): Middleware {
    return withDocument(this.doc)
  }
}
