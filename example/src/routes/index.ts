import { KobpServiceContext, KobpServiceState } from 'kobp'

import Router from 'koa-router'
import { LangController } from '../controller/LangController'
import { LibraryController } from '../controller/LibraryController'

export const makeRoutes = (): Router => {

  const api = new Router<KobpServiceState, KobpServiceContext>()
  api.use('/lang', ...new LangController().getMiddlewares() as any)
  api.use('/library', ...new LibraryController().getMiddlewares() as any)
  return api
}