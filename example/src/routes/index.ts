import Router from 'koa-router'
import { LangController } from '../controller/LangController'
import { ShelfController } from '../controller/ShelfController'

export const makeRoutes = (): Router => {

  const api = new Router()
  api.use('/lang', ...new LangController().getMiddlewares())
  api.use('/shelf', ...new ShelfController().getMiddlewares())
  return api
}