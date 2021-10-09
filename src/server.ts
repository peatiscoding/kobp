import type Router from 'koa-router'
import { MikroORM, MikroORMOptions, RequestContext } from '@mikro-orm/core'
import isFunction from 'lodash/isFunction'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import { DI, createDI } from './di'
import { isNumber } from 'lodash'
import { Server } from 'http'
import { Loggy, Lang, withJson } from '.'

interface MakeServerOptions {
  port: number
  onServerCreated?: (sv: Server) => void
  middlewareBeforeFork?: (app: Koa) => void
  middlewareAfterFork?: (app: Koa) => void
}

export const makeServer = async (initOrmOrConfig: MikroORMOptions | (() => Promise<MikroORM>), serviceRoutes: Router, portOrOptions: number | Partial<MakeServerOptions> = undefined): Promise<Koa> => {
  const orm = isFunction(initOrmOrConfig)
    ? await initOrmOrConfig()
    : await MikroORM.init(initOrmOrConfig)

  createDI(orm)

  let opts: MakeServerOptions = {
    port: +(process.env.PORT) || 3000,
    middlewareBeforeFork: (koa) => {
      koa.use(Loggy.autoCreate('_loggy'))
      koa.use(withJson())
      koa.use(bodyParser())
    },
    middlewareAfterFork: (koa) => {
      koa.use(Loggy.attach('_loggy'))
      koa.use(Lang.attach())
    },
  }
  if (!isNumber(portOrOptions)) {
    opts = {
      ...opts,
      ...portOrOptions,
    }
  } else {
    opts.port = portOrOptions
  }

  const app = new Koa()
  
  if (opts.middlewareBeforeFork) {
    opts.middlewareBeforeFork(app)
  }
  app.use((ctx, next) => RequestContext.createAsync(DI.orm.em, next))
  app.use(async (ctx, next) => {
    ctx.orm = DI.orm
    ctx.em = DI.orm.em
    await next()
  })
  if (opts.middlewareAfterFork) {
    opts.middlewareAfterFork(app)
  }
  app.use(serviceRoutes.routes())
  app.use(serviceRoutes.allowedMethods())

  // Completed
  const sv = app.listen(opts.port, '0.0.0.0', () => {
    console.log('Service is now listening for requests on port', opts.port)
  })

  // Server creation hook
  opts.onServerCreated && opts.onServerCreated(sv)

  return app
}