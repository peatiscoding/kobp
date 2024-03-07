import 'reflect-metadata'

import type { OpenApiBuilder, OpenAPIObject, PathItemObject, ServerObject, TagObject } from 'openapi3-ts/oas31'
import { KobpRouter, KobpServiceContext, METADATA_DOC_KEY } from '..'

interface SwaggerUIConfig {
  url?: string
  spec?: any
  dom_id: string
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
   */
  description: string
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
      description: '',
      servers: [],
      availableTags: [],
      ...options,
    }
  }

  public register(onPath: string, router: KobpRouter) {
    const safePath = onPath.replace(/\/+$/, '')
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
      ? (path: string): string => path.replace(this.options.basePath, '').replace(/^\/*/, '/')
      : (path: string) => path.replace(/^\/*/, '/') // make sure there is only one path
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
    builder.addInfo({
      title: this.title,
      version: this.options.version,
      description: this.options.description,
    })

    for (const tag of this.options.availableTags) {
      builder.addTag(tag)
    }
    for (const server of this.options.servers) {
      builder.addServer(server)
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
        layer.stack
          .filter((v) => {
            return Reflect.getMetadataKeys(v).indexOf(METADATA_DOC_KEY) >= 0
          })
          .map((stack) => {
            const metadata = Reflect.getMetadata(METADATA_DOC_KEY, stack)
            pathItem = {
              ...pathItem,
              ...metadata,
            }
          })
        pathItem = {
          [method.toLowerCase()]: {
            ...pathItem,
            responses: [],
          },
        }
      }
      builder.addPath(cleanPath(layer.path), pathItem)
    }
    return builder.getSpec()
  }
}
