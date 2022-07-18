import { CrudController } from "./_crud";
import { ShelfEntity } from "../entities";

export class ShelfController extends CrudController<ShelfEntity> {

  public constructor() {
    super(ShelfEntity, 'shelf', {
      resourceKeyPath: ':slug',
      defaultPopulate: () => ['books'] as any
    })
  }
}