import 'reflect-metadata'

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
import { KobpRouter, KobpServiceContext, METADATA_KEYS, ALL_METADATA_KEYS, OperationDocumentBuilder } from '..'

export interface ValidatableShape {
  query?: SchemaObject
  body?: SchemaObject
  parameters?: SchemaObject
}

export type OperationBuilder = (validatableShape: ValidatableShape) => OperationObject

interface SwaggerUIConfig {
  url?: string
  spec?: any
  dom_id: string
}

const _helpers = {
  removeTrailingSlashes(str: string) {
    if (str.endsWith('/')) {
      return _helpers.removeTrailingSlashes(str.slice(0, -1))
    }
    return str
  }
}

const generateSwaggerHtml = (
  title: string,
  specContentOrUrl: Record<string, any> | string = 'https://petstore3.swagger.io/api/v3/openapi.json',
) => {
  const swaggerUiConfig: SwaggerUIConfig = {
    url: typeof specContentOrUrl === 'string' ? specContentOrUrl : undefined,
    spec: typeof specContentOrUrl === 'string' ? undefined : specContentOrUrl,
    dom_id: '#swagger-ui',
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${title}" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
<script>
  window.onload = () => {
    window.ui = SwaggerUIBundle(${JSON.stringify(swaggerUiConfig)});
  };
</script>
</body>
</html>`
}

export type SwaggerMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS'

interface SkipPathPredicate {
  (path: string): boolean
}

/**
 * Simplified swagger information
 */
export interface SwaggerControllerOption {
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

// Plain controller for using SwaggerUI Dist package
export class SwaggerController {
  protected options: SwaggerControllerOption
  protected builder: () => OpenApiBuilder

  constructor(
    public readonly title: string,
    options: Partial<SwaggerControllerOption>,
  ) {
    const mod = require('openapi3-ts/oas31')
    const _builder_ = mod.OpenApiBuilder
    if (!_builder_) {
      throw new Error('Cannot use SwaggerController without "openapi3-ts" package. Please install the module first.')
    }
    this.builder = () => new mod.OpenApiBuilder()
    this.options = {
      skipMethods: ['HEAD'],
      skipPaths: ['swagger'],
      version: '1.0.0',
      basePath: '',
      description: (desc: string) => desc,
      servers: [],
      availableTags: [],
      securitySchemes: {},
      securityOnAllOperations: [],
      ...options,
    }
  }

  public register(onPath: string, router: KobpRouter) {
    const safePath = _helpers.removeTrailingSlashes(onPath)
    router.get(safePath, (context) => this.getSwagger(context, router))
    router.get(safePath + '/index.html', (context) => this.getSwagger(context, router))
    router.get(safePath + '/spec.json', (context) => this.getSpecJsonUrl(context, router))
  }

  public getSwagger(context: KobpServiceContext, router: KobpRouter) {
    context.response.body = generateSwaggerHtml(this.title, this.deriveApiSpec(router))
  }

  public getSpecJsonUrl(context: KobpServiceContext, router: KobpRouter) {
    // get router
    context.response.body = JSON.stringify(this.deriveApiSpec(router))
  }

  protected deriveApiSpec(router: KobpRouter): OpenAPIObject {
    const skipPaths = this.options.skipPaths
    const skipMethods = new Set<string>(this.options.skipMethods)
    const cleanPath = this.options.basePath
      ? (path: string): string =>
          path
            .replace(this.options.basePath, '')
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

    const builder = this.builder()
    const description = this.options.description
    builder.addInfo({
      title: this.title,
      version: this.options.version,
      description:
        typeof description === 'function'
          ? description("**NOTE**: The OpenAPI's specification is also available at [spec.json](./spec.json)")
          : description,
    })

    for (const tag of this.options.availableTags) {
      builder.addTag(tag)
    }
    for (const server of this.options.servers) {
      builder.addServer(server)
    }
    for (const schemeName of Object.keys(this.options.securitySchemes)) {
      builder.addSecurityScheme(schemeName, this.options.securitySchemes[schemeName])
    }

    for (const layer of router.stack) {
      if (skipPathPredicate(layer.path)) {
        continue
      }
      const methods = layer.methods
      let pathItem: PathItemObject = {}
      for (const method of methods) {
        if (skipMethods.has(method)) {
          continue
        }
        // Extract document data
        let opDoc: OperationObject = {}
        // initialize operation document with default security
        if (this.options.securityOnAllOperations) {
          opDoc.security = this.options.securityOnAllOperations || []
        }
        let validationSpecBuffer: {
          query?: SchemaObject
          body?: SchemaObject
          parameters?: SchemaObject
          headers?: SchemaObject
        } = {}
        layer.stack.map((stack) => {
          const keys = Reflect.getMetadataKeys(stack).filter((k) => ALL_METADATA_KEYS.has(k))
          for (const key of keys) {
            // Found a meta of documentation node!
            if (key === METADATA_KEYS.DOC_KEY) {
              const opSpec = Reflect.getMetadata(METADATA_KEYS.DOC_KEY, stack) as OperationObject
              const builder = new OperationDocumentBuilder({ ...opDoc, ...opSpec })
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
              if (validationSpecBuffer.parameters) {
                const shape = validationSpecBuffer.parameters
                for (const key of Object.keys(shape.properties)) {
                  const { description } = shape.properties[key]
                  builder.useParameter('path', key, {
                    schema: shape.properties[key],
                    description,
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
              validationSpecBuffer.parameters = Reflect.getMetadata(
                METADATA_KEYS.DOC_PARAMS_SHAPE_VALIDATION_KEY,
                stack,
              )
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
}
