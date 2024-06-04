import 'reflect-metadata'

import type { KobpRouter } from '../controllers'

import type {
  OpenApiBuilder,
  OpenAPIObject,
  OperationObject,
  PathItemObject,
  SchemaObject,
  SecurityRequirementObject,
  SecuritySchemeObject,
  ServerObject,
  TagObject,
} from 'openapi3-ts/oas31'

import { METADATA_KEYS, ALL_METADATA_KEYS, OperationDocumentBuilder } from '..'

export type SwaggerMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS'

export type SkipPathPredicate = (path: string) => boolean

/**
 * Simplified swagger information
 */
export interface SwaggerGenerationOption {
  /**
   * version tag of this API
   */
  version: string
  /**
   * Description of this API
   *
   * this can be a string or a function
   * the string can be written in markdown
   */
  description: string | ((defaultText: string) => string)
  /**
   * Skip methods
   */
  skipMethods: SwaggerMethod[]
  /**
   * Provided the path's prefix to remove from all
   * paths.
   */
  basePath: string
  /**
   * Skip paths
   */
  skipPaths: (string | RegExp)[] | SkipPathPredicate
  /**
   * server informations
   */
  servers: ServerObject[]
  /**
   * Available tags of the whole system
   */
  availableTags: TagObject[]

  /**
   * Security requirement that will be applied on all path
   */
  securityOnAllOperations: SecurityRequirementObject[]

  /**
   * Define security scheme for this API document. The list can be used by security requirement objects.
   */
  securitySchemes: Record<string, SecuritySchemeObject>
}

/**
 * Extract API specification from given router object
 */
export const deriveApiSpec = (
  title: string,
  someOptions: Partial<SwaggerGenerationOption>,
  builder: OpenApiBuilder,
  router: KobpRouter,
): OpenAPIObject => {
  const options: SwaggerGenerationOption = {
    skipMethods: ['HEAD'],
    skipPaths: ['swagger'],
    version: '1.0.0',
    basePath: '',
    description: (desc: string) => desc,
    servers: [],
    availableTags: [],
    securitySchemes: {},
    securityOnAllOperations: [],
    ...someOptions,
  }
  const skipPaths = options.skipPaths
  const skipMethods = new Set<string>(options.skipMethods)
  const cleanPath = options.basePath
    ? (path: string): string =>
        path
          .replace(options.basePath, '')
          .replace(/^\/*/, '/')
          .replace(/:(\w+)/g, '{$1}')
    : (path: string) => path.replace(/^\/*/, '/').replace(/:(\w+)/g, '{$1}') // make sure there is only one path
  const skipPathPredicate: SkipPathPredicate =
    typeof skipPaths === 'function'
      ? skipPaths
      : (path) => {
          for (const skipPath of skipPaths) {
            if (typeof skipPath === 'string') {
              return path.startsWith(skipPath)
            }
            return skipPath.test(path)
          }
          return false
        }

  const description = options.description
  builder.addInfo({
    title: title,
    version: options.version,
    description:
      typeof description === 'function'
        ? description("**NOTE**: The OpenAPI's specification is also available at [spec.json](./spec.json)")
        : description,
  })

  for (const tag of options.availableTags) {
    builder.addTag(tag)
  }
  for (const server of options.servers) {
    builder.addServer(server)
  }
  for (const schemeName of Object.keys(options.securitySchemes)) {
    builder.addSecurityScheme(schemeName, options.securitySchemes[schemeName])
  }

  for (const layer of router.stack) {
    // Skip the path
    if (skipPathPredicate(layer.path)) {
      continue
    }
    // String array of path parameter keys
    const pathParameterKeys = [...layer.path.matchAll(/:(\w+)/g)].map((d) => d[1])
    const methods = layer.methods
    let pathItem: PathItemObject = {}
    for (const method of methods) {
      if (skipMethods.has(method)) {
        continue
      }
      // Extract document data
      let opDoc: OperationObject = {}
      // initialize operation document with default security
      if (options.securityOnAllOperations) {
        opDoc.security = options.securityOnAllOperations || []
      }
      let validationSpecBuffer: {
        query?: SchemaObject
        body?: SchemaObject
        parameters?: SchemaObject
        headers?: SchemaObject
      } = {}
      layer.stack.map((stack) => {
        // try to access the metadata defined within the stack
        const keys = Reflect.getMetadataKeys(stack).filter((k) => ALL_METADATA_KEYS.has(k))
        for (const key of keys) {
          // Found a meta of documentation node!
          if (key === METADATA_KEYS.DOC_KEY) {
            const opSpecFn = Reflect.getMetadata(METADATA_KEYS.DOC_KEY, stack) as () => OperationObject
            const builder = new OperationDocumentBuilder({ ...opDoc, ...opSpecFn() })
            // FIXME: Handle the path definition
            // merge?
            if (validationSpecBuffer.body) {
              // inject body
              builder.useBody({
                required: true,
                content: {
                  'application/json': {
                    schema: validationSpecBuffer.body,
                  },
                },
              })
            }
            // Add default doc first
            const undocumentedParams = new Set<string>(pathParameterKeys)
            if (validationSpecBuffer.parameters) {
              const shape = validationSpecBuffer.parameters
              for (const key of Object.keys(shape.properties)) {
                const { description } = shape.properties[key]
                undocumentedParams.delete(key)
                builder.useParameter('path', key, {
                  schema: shape.properties[key],
                  description,
                  required: true,
                })
              }
            }
            if (undocumentedParams.size > 0) {
              for (const key of undocumentedParams) {
                builder.useParameter('path', key, {
                  schema: {
                    type: 'string',
                  },
                  required: true,
                })
              }
            }
            if (validationSpecBuffer.headers) {
              const shape = validationSpecBuffer.headers
              for (const key of Object.keys(shape.properties)) {
                const { description } = shape.properties[key]
                builder.useParameter('header', key, {
                  schema: shape.properties[key],
                  description,
                })
              }
            }
            if (validationSpecBuffer.query) {
              const shape = validationSpecBuffer.query
              for (const key of Object.keys(shape.properties)) {
                const { description } = shape.properties[key] as any
                builder.useParameter('query', key, {
                  schema: shape.properties[key],
                  description,
                })
              }
            }
            opDoc = builder.build()
          } else if (key === METADATA_KEYS.DOC_BODY_SHAPE_VALIDATION_KEY) {
            validationSpecBuffer.body = Reflect.getMetadata(METADATA_KEYS.DOC_BODY_SHAPE_VALIDATION_KEY, stack)
          } else if (key === METADATA_KEYS.DOC_HEADERS_SHAPE_VALIDATION_KEY) {
            validationSpecBuffer.headers = Reflect.getMetadata(METADATA_KEYS.DOC_HEADERS_SHAPE_VALIDATION_KEY, stack)
          } else if (key === METADATA_KEYS.DOC_PARAMS_SHAPE_VALIDATION_KEY) {
            validationSpecBuffer.parameters = Reflect.getMetadata(METADATA_KEYS.DOC_PARAMS_SHAPE_VALIDATION_KEY, stack)
          } else if (key === METADATA_KEYS.DOC_QUERY_SHAPE_VALIDATION_KEY) {
            validationSpecBuffer.query = Reflect.getMetadata(METADATA_KEYS.DOC_QUERY_SHAPE_VALIDATION_KEY, stack)
          }
        }
      })
      pathItem = {
        [method.toLowerCase()]: {
          responses: [],
          ...opDoc,
        },
      }
    }
    builder.addPath(cleanPath(layer.path), pathItem)
  }
  return builder.getSpec()
}
