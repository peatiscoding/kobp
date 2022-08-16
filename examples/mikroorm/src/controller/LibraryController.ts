import { CrudController } from 'kobp-mikroorm'
import { BookEntity, LibraryEntity } from "../entities"

export class LibraryController extends CrudController<LibraryEntity> {

  public constructor() {
    super(LibraryEntity, 'library', {
      resourceKeyPath: ':slug',
      defaultPopulate: () => ['shelves'] as any,
      sanitizeInputBody: async (ctx, em, body) => {
        // prepare all-resources findAll()
        await em.getRepository(BookEntity).findAll()
        return body
      }
    })
  }
}