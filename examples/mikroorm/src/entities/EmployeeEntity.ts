import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  Filter,
  Enum,
} from '@mikro-orm/core'

export enum StatusEmployee {
  ONLINE = 'online',
  OFFLINE = 'offline'
}

@Filter({
  name: 'searchEmployee', cond: args => ({
    $or: [
      {
        nickname: {
          $like: args.name
        },
      },
      {
        nameth: {
          $like: args.name
        },
      },
    ],
  }),
})
@Filter({
  name: 'directoryReport', cond: args => ({
    directReport: {
      employeeId: {
        $eq: args.directoryReport
      },
    },
  }),
})
@Entity()
export class EmployeeEntity {

  @PrimaryKey({
    columnType: 'varchar(40)',
    primary: true,
    nullable: false,
  })
  employeeId!: string

  @Enum(() => StatusEmployee)
  @Property({
    nullable: false,
  })
  status: StatusEmployee = StatusEmployee.ONLINE

  @Property({
    columnType: 'timestamp',
    nullable: false,
  })
  start: Date = new Date()

  @Property({
    columnType: 'timestamp',
    nullable: true,
  })
  resigned: Date | null = null

  @Property({
    columnType: 'varchar(150)',
    nullable: false,
  })
  nameth!: string

  @Property({
    columnType: 'varchar(150)',
    nullable: false,
  })
  nickname!: string

  @Property({
    columnType: 'varchar(150)',
    nullable: false,
  })
  email!: string

  @ManyToOne({
    nullable: true,
    entity: 'EmployeeEntity',
  })
  directReport!: EmployeeEntity

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
  updatedAt: Date = new Date()
}

