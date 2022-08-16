import { CrudController, DI } from "kobp-mikroorm";
import { BookEntity, BookTagEntity } from "src/entities";

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
}