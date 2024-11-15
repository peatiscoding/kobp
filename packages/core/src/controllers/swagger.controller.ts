import type { OpenApiBuilder, SchemaObject } from 'openapi3-ts/oas31'
import { KobpRouter, KobpServiceContext } from '..'

import { deriveApiSpec, SwaggerGenerationOption } from '../utils/swagger'

export interface ValidatableShape {
  query?: SchemaObject
  body?: SchemaObject
  parameters?: SchemaObject
}

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
  },
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

// Plain controller for using SwaggerUI Dist package
export class SwaggerController {
  protected builder: () => OpenApiBuilder

  constructor(
    public readonly title: string,
    protected options: Partial<SwaggerGenerationOption>,
  ) {
    const mod = require('openapi3-ts/oas31')
    const _builder_ = mod.OpenApiBuilder
    if (!_builder_) {
      throw new Error('Cannot use SwaggerController without "openapi3-ts" package. Please install the module first.')
    }
    this.builder = () => new mod.OpenApiBuilder()
  }

  public register(onPath: string, router: KobpRouter) {
    const safePath = _helpers.removeTrailingSlashes(onPath)
    router.get(safePath, (context) => this.getSwagger(context, router))
    router.get(safePath + '/index.html', (context) => this.getSwagger(context, router))
    router.get(safePath + '/spec.json', (context) => this.getSpecJsonUrl(context, router))
  }

  public getSwagger(context: KobpServiceContext, router: KobpRouter) {
    const builder = this.builder()
    context.response.body = generateSwaggerHtml(this.title, deriveApiSpec(this.title, this.options, builder, router))
  }

  public getSpecJsonUrl(context: KobpServiceContext, router: KobpRouter) {
    const builder = this.builder()
    // get router
    context.response.body = JSON.stringify(deriveApiSpec(this.title, this.options, builder, router))
  }
}
