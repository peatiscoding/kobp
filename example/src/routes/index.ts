import { KobpServiceContext, KobpServiceState } from 'kobp'

import Router from 'koa-router'
import { LangController } from '../controller/LangController'
import { LibraryController } from '../controller/LibraryController'
import { BooksController } from 'src/controller/BooksController'
import { BookTagsController } from 'src/controller/BookTagsController'

export const makeRoutes = (): Router => {

  const api = new Router<KobpServiceState, KobpServiceContext>()
  api.use('/lang', ...new LangController().getMiddlewares() as any)
  api.use('/library', ...new LibraryController().getMiddlewares() as any)
  api.use('/book/tag/', ...new BookTagsController().getMiddlewares() as any)
  api.use('/book', ...new BooksController().getMiddlewares() as any)
  return api
}