
import { KobpServiceContext, KobpServiceState } from 'kobp'

import Router from 'koa-router'
import { HelloController } from 'src/controllers/hello.controller'

export const makeRoutes = (): Router => {
  const api = new Router<KobpServiceState, KobpServiceContext>()
  api.use('/hello', ...new HelloController().getMiddlewares() as any)
  return api
}