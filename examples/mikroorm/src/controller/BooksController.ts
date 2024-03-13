import { KobpServiceContext, Route, withDocument } from 'kobp'
import { CrudController, DI } from 'kobp-mikroorm'
import { repeat } from 'lodash'
import { BookEntity, BookTagEntity } from '../entities'

export class BooksController extends CrudController<BookEntity> {
  constructor() {
    super(BookEntity, 'books', {
      resourceKeyPath: ':isbn',
      searchableFields: ['isbn'],
      distinctableFields: ['isbn'],
      useDocumentMiddleware: true,
      preSave: [
        async (ctx, em, obj) => {
          await DI.em.find(BookTagEntity, {})
          return obj
        },
      ],
      middlewares: [
        withDocument({
          tags: ['books'],
        }),
      ],
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
