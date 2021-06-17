import { CrudController } from "../../../src";
import { ShelfEntity } from "../entities";

export class ShelfController extends CrudController<ShelfEntity> {

  public constructor() {
    super(ShelfEntity, 'shelf', {
      resourceKeyPath: ':slug',
      defaultPopulate: () => ['books']
    })
  }
}