import { Middleware } from 'koa'
import { KobpServiceContext, Route, withDocument, withValidation } from 'kobp'
import { CrudController, DI } from 'kobp-mikroorm'
import { repeat } from 'lodash'
import { BookEntity, BookTagEntity } from '../entities'
import { s } from 'ajv-ts'

export class BooksController extends CrudController<BookEntity> {
  constructor() {
    super(BookEntity, 'books', {
      resourceKeyPath: ':isbn',
      searchableFields: ['isbn'],
      distinctableFields: ['isbn'],
      useDocumentMiddleware: {},
      preSave: [
        async (ctx, em, obj) => {
          await DI.em.find(BookTagEntity, {})
          return obj
        },
      ],
      middlewares: (_path, method) => {
        const allRoutes: Middleware[] = []
        if (method === 'post' || method === 'put') {
          allRoutes.push(
            withValidation({
              body: s.object({
                isbn: s.string().describe('ISBN of the book'),
                title: s.string().describe('Title of the book'),
                numberOfPages: s.number().default(1).describe('Number of pages'),
              }),
            }),
          )
        }
        allRoutes.push(
          withDocument({
            tags: ['books'],
          }),
        )
        return allRoutes
      },
    })
  }

  @Route({
    method: 'post',
    path: '/load',
    middlewares: [withDocument((b) => b.onOk(BookEntity))],
  })
  async load(context: KobpServiceContext) {
    const arr = repeat('SomeArray', 100_000)
    const data = repeat('Data', 100_000)
    const numbers = repeat(`${300}`, 100_000)
    return {
      arr,
      data,
      numbers,
    }
  }
}
