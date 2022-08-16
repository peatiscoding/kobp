import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core'
import { CriteriaLevelEntity } from './CriteriaLevelEntity'
import { EvaluationRecordEntity } from './EvaluationEntity'

// import meanBy from 'lodash/meanBy'

@Entity()
export class EvaluationDetailEntity {

  @PrimaryKey()
  id!: number

  // Parent Entity.
  @ManyToOne({
    entity: 'EvaluationRecordEntity',
    onDelete: 'cascade',
  })
  evaluation!: EvaluationRecordEntity

  @ManyToOne({ 
    entity: 'CriteriaLevelEntity',
    eager: true,
    // do not orphan this it is just being used as source of data (M2M)
  })
  criteriaLevel!: CriteriaLevelEntity
  
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
}