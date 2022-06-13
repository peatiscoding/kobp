import { KobpServiceContext, KobpServiceState } from 'kobp'

import Router from 'koa-router'
import { LangController } from '../controller/LangController'
import { ShelfController } from '../controller/ShelfController'

export const makeRoutes = (): Router => {

  const api = new Router<KobpServiceState, KobpServiceContext>()
  api.use('/lang', ...new LangController().getMiddlewares() as any)
  api.use('/shelf', ...new ShelfController().getMiddlewares() as any)
  return api
}