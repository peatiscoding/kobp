import type Router from 'koa-router'
import { BootstrapLoader, KobpCustomization } from 'kobp'
import serverless, { Handler } from 'serverless-http'

export interface LambdaHandlerOptions extends serverless.Options {
  kobpCustomization?: KobpCustomization
  customizer?: (loader: BootstrapLoader) => void
}

/**
 * Make a serverless http handler using Koa's router.
 * @param serviceRouter
 * @param options - see https://github.com/dougmoscrop/serverless-http/blob/HEAD/docs/ADVANCED.md
 */
 export const makeLambdaHandler = (serviceRouter: Router, options: LambdaHandlerOptions = {}): Handler => {
  const loader = new BootstrapLoader()
  const { customizer, kobpCustomization, ...opts } = options
  if (customizer) {
    customizer(loader)
  }
  const app = loader.buildSync(serviceRouter, kobpCustomization || {})
  return serverless(app, opts)
}