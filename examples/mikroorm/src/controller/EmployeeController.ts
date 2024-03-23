import { CrudController } from 'kobp-mikroorm'
import { EmployeeEntity } from '../entities'

export class EmployeeController extends CrudController<EmployeeEntity> {
  public constructor() {
    super(EmployeeEntity, 'employee', {
      useDocumentMiddleware: true,
      resourceKeyPath: ':employeeId',
    })
  }
}

