import { CrudController } from 'kobp-mikroorm'
import { CriteriaLevelEntity } from '../entities'

export class CriteriaLevelController extends CrudController<CriteriaLevelEntity> {
  public constructor() {
    super(CriteriaLevelEntity, 'criteriaLevel', {
      useDocumentMiddleware: true,
    })
  }
}

