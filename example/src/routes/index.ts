import Router from 'koa-router'
import { ShelfController } from '../controller/ShelfController'

export const makeRoutes = (): Router => {

  const api = new Router()
  api.use('/shelf', ...new ShelfController().getMiddlewares())
  return api
}