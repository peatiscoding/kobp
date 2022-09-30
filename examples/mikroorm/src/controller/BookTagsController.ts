import { CrudController } from "kobp-mikroorm";
import { BookTagEntity } from "../entities";

export class BookTagsController extends CrudController<BookTagEntity> {

  constructor() {
    super(BookTagEntity, 'book-tags', {
      resourceKeyPath: ':slug',
    })
  }
}