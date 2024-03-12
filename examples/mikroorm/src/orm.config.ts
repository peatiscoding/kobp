import { MikroORM, defineConfig } from '@mikro-orm/core'
import { PostgreSqlDriver } from '@mikro-orm/postgresql'
import {
  BookEntity,
  LibraryEntity,
  BookTagEntity,
  LibraryShelfEntity,
  EmployeeEntity,
  CriteriaLevelEntity,
  EvaluationDetailEntity,
  EvaluationRecordEntity,
} from './entities'
import { Migrator } from '@mikro-orm/migrations'

const ormConfig = defineConfig({
  entities: [
    BookEntity,
    BookTagEntity,
    LibraryEntity,
    LibraryShelfEntity,
    EmployeeEntity,
    CriteriaLevelEntity,
    EvaluationDetailEntity,
    EvaluationRecordEntity,
  ],
  forceUtcTimezone: true,
  dbName: process.env.ORM_DBNAME || 'test_db',
  host: process.env.ORM_HOST || 'localhost',
  port: +(process.env.ORM_PORT || 54322),
  user: process.env.ORM_USER || 'tester',
  password: process.env.ORM_PASSWORD || 'password',
  driver: PostgreSqlDriver,
  tsNode: true,
  migrations: {
    snapshot: false,
    path: process.cwd() + `/${process.env.NODE_ENVIRONMENT === 'production' ? 'dist' : 'src'}/migrations/`,
    allOrNothing: true,
    disableForeignKeys: false,
  },
  extensions: [Migrator],
})

export const makeDbConfig = () =>
  MikroORM.init({
    ...ormConfig,
    debug: true,
  })

export default ormConfig
