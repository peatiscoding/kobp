import type { Logger } from './utils/logger'
import { Context, Middleware as KoaMiddleware } from 'koa'

export interface KobpServiceContext extends Context {
  logger?: Logger
}

export interface KobpServiceState {
}

export type Middleware = KoaMiddleware<KobpServiceState, KobpServiceContext>