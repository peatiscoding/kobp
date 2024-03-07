import { KobpServiceContext, KobpServiceState, SwaggerController } from 'kobp'

import Router from 'koa-router'
import { HelloController } from 'src/controllers/hello.controller'

export const makeRoutes = (): Router => {
  const api = new Router<KobpServiceState, KobpServiceContext>()
  api.use('/hello', ...(new HelloController().getMiddlewares() as any))
  new SwaggerController('simplest example API', {
    version: '1.0.0',
    basePath: '/',
    skipPaths: ['/swagger'],
    skipMethods: ['HEAD'],
    availableTags: [{ name: 'hello', description: 'Set of Hello APIs' }],
  }).register('/swagger', api)
  return api
}
