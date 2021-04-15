import type Router from 'koa-router'
import { MikroORM, MikroORMOptions, RequestContext } from '@mikro-orm/core'
import isFunction from 'lodash/isFunction'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import { DI, createDI } from './di'
import { withJson } from './middlewares'
import { KobpServiceContext } from './context'

export const makeServer = async (initOrmOrConfig: MikroORMOptions | (() => Promise<MikroORM>), serviceRoutes: Router, port: number = undefined): Promise<Koa> => {
  const orm = isFunction(initOrmOrConfig)
    ? await initOrmOrConfig()
    : await MikroORM.init(initOrmOrConfig)

  createDI(orm)

  const app = new Koa()
  
  app.use(withJson(console))
  app.use(bodyParser())
  app.use((ctx: KobpServiceContext, next) => RequestContext.createAsync(DI.orm.em, async () => {
    ctx.orm = DI.orm
    ctx.em = DI.orm.em as any
    await next()
  }))
  app.use(serviceRoutes.routes())
  app.use(serviceRoutes.allowedMethods())

  // Completed
  const finalPort = +(port || process.env.PORT) || 3000
  app.listen(finalPort, '0.0.0.0', () => {
    console.log('Service is now listening for requests on port', finalPort)
  })

  return app
}