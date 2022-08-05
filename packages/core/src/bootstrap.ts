import { MikroORM, MikroORMOptions, RequestContext } from '@mikro-orm/core'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
import { isFunction } from 'lodash'
// import { Middleware } from './context'

import { createDI, DI } from './di'
import { withJson } from './middlewares'
import { Lang, Loggy } from './utils'
import { RequestRoomProvider } from './utils/RequestContext'

/**
 * Parameters those would effect how system behave upon creation.
 */
export interface BootstrapOptions {
  allowedBodyTypes?: ('json' | 'form')[]
  onAppCreated?: (app: Koa) => void
  middlewareBeforeFork?: (app: Koa) => void
  middlewareAfterFork?: (app: Koa) => void
}

export const bootstrap = async (initOrmOrConfig: MikroORMOptions | (() => Promise<MikroORM>), serviceRoutes: Router, opts: Partial<BootstrapOptions>): Promise<Koa> => {
  const orm = isFunction(initOrmOrConfig)
    ? await initOrmOrConfig()
    : await MikroORM.init(initOrmOrConfig)

  createDI(orm)

  const allowedBodyTypes: string[] = ((): string[] => {
    if (opts?.allowedBodyTypes) {
      return opts.allowedBodyTypes
    }
    return `${(process.env.KOBP_ALLOWED_BODY_TYPES || 'json,form')}`.trim().split(',').filter(Boolean)
  })()

  // Actual Bootstraping
  const app = new Koa()
   
  // Before Fork
  app.use(Loggy.autoCreate('_loggy'))
  app.use(withJson('_loggy'))
  app.use(bodyParser({
    enableTypes: allowedBodyTypes,
  }))
  if (opts.middlewareBeforeFork) {
    opts.middlewareBeforeFork(app)
  }

  // Fork
  app.use((ctx, next) => RequestContext.createAsync(DI.orm.em, next))
  app.use((ctx, next) => RequestRoomProvider.shared.createAsync(<any>ctx, next))
  app.use(async (ctx, next) => {
    ctx.orm = DI.orm
    ctx.em = DI.orm.em
    Loggy.log('WTF233', Lang.current('th'))
    await next()
  })
  // After Fork
  if (opts.middlewareAfterFork) {
    opts.middlewareAfterFork(app)
  }

  app.use(serviceRoutes.routes())
  app.use(serviceRoutes.allowedMethods())

  opts.onAppCreated && opts.onAppCreated(app)

  return app
}