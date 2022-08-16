import {
  Entity,
  PrimaryKey,
  Property
} from '@mikro-orm/core'

@Entity()
export class CriteriaLevelEntity {
  [x: string]: any

  @PrimaryKey()
  id!: number

  @Property({
    type: 'varchar(200)',
    nullable: false,
  })
  title: string
}