import { CrudController } from "./_crud"
import { LibraryEntity } from "../entities"

export class LibraryController extends CrudController<LibraryEntity> {

  public constructor() {
    super(LibraryEntity, 'library', {
      resourceKeyPath: ':slug',
      defaultPopulate: () => ['shelves'] as any
    })
  }
}