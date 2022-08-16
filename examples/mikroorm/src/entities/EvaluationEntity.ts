import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  Enum,
  Filter,
  OneToMany,
  Cascade,
  Collection,
  OneToOne,
} from '@mikro-orm/core'
import { EmployeeEntity } from './EmployeeEntity'
import { EvaluationDetailEntity } from './EvaluationDetailEntity'

export enum StatusEvaluation {
  WAITING_FOR_APPROVER = 'waiting_for_approver',
  APPROVER = 'approver',
  NEW = 'new',
}

@Filter({
  name: 'searchEmployee',
  cond: args => ({
    $or: [
      {
        evaluateTo: {
          nickname: {
            $like: args.name
          },
        }
      },
      {
        evaluateTo: {
          nameth: {
            $like: args.name
          },
        },
      }
    ],
  }),
})
// filter can not evaluate employee is higher than current level own
@Filter({
  name: 'getEmployeeLevelLss',
  cond: args => ({
    $and: [
      {
        evaluateTo: {
          currentLevel: {
            levelDepartment: {
              level: {
                $lt: args.level
              }
            }
          }
        }
      },
      {
        evaluateTo: {
          $ne: args.employeeId
        },
      }
    ],
  }),
})
@Filter({
  name: 'currentLevel',
  cond: args => ({
    $and: [
      {
        evaluateTo: {
          currentLevel: {
            levelDepartment: {
              level: {
                $eq: args.level
              }
            }
          }
        }
      }
    ]
  }),
})
@Filter({
  name: 'department',
  cond: args => ({
    $and: [
      {
        evaluateTo: {
          currentLevel: {
            levelDepartment: {
              department: {
                departmentName: {
                  $eq: args.department
                }
              }
            }
          }
        }
      }
    ]
  }),
})
@Filter({
  name: 'filterDirectReport',
  cond: args => ({
    $and: [
      {
        evaluateTo: {
          directReport: {
            employeeId: {
              $eq: args.directReport
            }
          }
        }
      }
    ]
  }),
})
@Filter({
  name: 'directReport',
  cond: args => ({
    $and: [
      {
        evaluateBy: args.evaluateBy
      }
    ]
  }),
})
@Entity()
export class EvaluationRecordEntity {

  @PrimaryKey()
  id!: number

  @OneToMany({ 
    entity: () => EvaluationDetailEntity, 
    mappedBy: 'evaluation', 
    cascade: [Cascade.PERSIST],
    orphanRemoval: true,
  })
  details = new Collection<EvaluationDetailEntity>(this)

  @ManyToOne({
    entity: 'EmployeeEntity',
    nullable: false,
  })
  evaluateTo!: EmployeeEntity

  @ManyToOne({
    entity: 'EmployeeEntity',
    nullable: false,
  })
  evaluatedBy!: EmployeeEntity

  @Enum(() => StatusEvaluation)
  @Property({
    nullable: false,
  })
  status: StatusEvaluation = StatusEvaluation.NEW

  @ManyToOne({
    entity: 'EmployeeEntity',
    nullable: true,
    eager: true,
  })
  approverBy: EmployeeEntity | null = null

  @Property({
    columnType: 'timestamp',
    nullable: true,
  })
  approvedAt: Date | null = null

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onCreate: () => new Date(),
  })
  createdAt: Date = new Date()

  @Property({
    columnType: 'timestamp',
    nullable: true,
    onUpdate: () => new Date(),
  })
  updatedAt: Date | null = null

  @OneToOne({
    nullable: true,
    entity: 'EvaluationRecordEntity',
    eager: true
  })
  prev: EvaluationRecordEntity | null = null
}
