import { KobpServiceContext, Route } from "kobp";
import { CrudController, DI } from "kobp-mikroorm";
import { repeat } from "lodash";
import { BookEntity, BookTagEntity } from "../entities";

export class BooksController extends CrudController<BookEntity> {

  constructor() {
    super(BookEntity, 'books', {
      resourceKeyPath: ':isbn',
      preSave: [
        async (ctx, em, obj) => {
          await DI.em.find(BookTagEntity, {})
          return obj
        }
      ]
    })
  }

  @Route({
    method: 'post',
    path: '/load',
    middlewares: [],
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