import type { Logger } from './utils/logger'
import type { MikroORM } from '@mikro-orm/core'
import type { EntityManager } from '@mikro-orm/knex'
import { Context, Middleware as KoaMiddleware } from 'koa'

export interface KobpServiceContext extends Context {
  logger?: Logger
  orm: MikroORM
  em: EntityManager
}

export interface KobpServiceState {
}

export type Middleware = KoaMiddleware<KobpServiceState, KobpServiceContext>