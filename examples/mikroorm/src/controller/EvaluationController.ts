import { ClientErrorCode, KobpError } from 'kobp'
import { CrudController, DI } from 'kobp-mikroorm'
import { EmployeeEntity, EvaluationRecordEntity } from '../entities'

export class EvaluationController extends CrudController<EvaluationRecordEntity> {
  public constructor() {
    super(EvaluationRecordEntity, 'eval', {
      resourceKeyPath: ':id',
      defaultPopulate: (ctx) => ['details'] as any,
      useDocumentMiddleware: true,
      middlewares: [
        async (ctx, next) => {
          console.log('Im here')
          const employeeId = ctx.params.employeeId
          if (!employeeId) {
            throw KobpError.fromUserInput(ClientErrorCode.badRequest, 'EmployeeId is required on this request.')
          }
          const employee = await DI.em.getRepository(EmployeeEntity).findOneOrFail(employeeId)
          ctx.employee = employee
          await next()
        },
      ],
      forAllResources: (ctx) => {
        return {
          evaluateTo: ctx.employee,
        }
      },
      sanitizeInputBody: async (ctx, em, body) => {
        // prepare all-resources findAll()
        await em.getRepository(EmployeeEntity).findAll()
        return body
      },
    })
  }
}

