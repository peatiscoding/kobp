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
  dbName: 'test_db',
  host: 'localhost',
  port: 54322,
  user: 'tester',
  password: 'password',
  type: 'postgresql', // one of `mongo` | `mysql` | `mariadb` | `postgresql` | `sqlite`
  tsNode: true,
  migrations: {
    path:
      process.cwd() +
      `/${
        process.env.NODE_ENVIRONMENT === 'production' ? 'lib' : 'src'
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