import { MikroORM, MikroORMOptions } from '@mikro-orm/core'
import {
  BookEntity,
  ShelfEntity,
} from './entities'

const ormConfig = <Partial<MikroORMOptions>>{
  entities: [
    ShelfEntity,
    BookEntity,
  ],
  forceUtcTimezone: true,
  dbName: 'test_db',
  host: 'localhost',
  port: 54321,
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