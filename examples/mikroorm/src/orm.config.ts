import {
  MikroORM,
  MikroORMOptions
} from '@mikro-orm/core'
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

const ormConfig = <Partial<MikroORMOptions>>{
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
  port: process.env.ORM_PORT || 54322,
  user: process.env.ORM_USER || 'tester',
  password: process.env.ORM_PASSWORD || 'password',
  type: 'postgresql', // one of `mongo` | `mysql` | `mariadb` | `postgresql` | `sqlite`
  tsNode: true,
  migrations: {
    snapshot: false,
    path:
      process.cwd() +
      `/${
        process.env.NODE_ENVIRONMENT === 'production' ? 'dist' : 'src'
      }/migrations/`,
    pattern: /^[\w-]+\d+\.[jt]s$/,
    allOrNothing: true,
    disableForeignKeys: false,
  },
}

export const makeDbConfig = () => MikroORM.init({
  ...ormConfig,
  debug: true,
})

export default ormConfig
