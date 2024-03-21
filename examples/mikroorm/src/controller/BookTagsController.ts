import { CrudController } from 'kobp-mikroorm'
import { BookTagEntity } from '../entities'
import { withValidation } from 'kobp'
import s from 'ajv-ts'

export class BookTagsController extends CrudController<BookTagEntity> {
  constructor() {
    super(BookTagEntity, 'book-tags', {
      useDocumentMiddleware: {
        resourceScheme: BookTagEntity as any,
      },
      resourceKeyPath: ':slug',
      middlewares: [
        withValidation({
          body: s.object({
            
          })
        })
      ],
    })
  }
}

