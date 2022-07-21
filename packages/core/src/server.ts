import type Router from 'koa-router'
import { MikroORM, MikroORMOptions } from '@mikro-orm/core'
import Koa from 'koa'
import { Server } from 'http'
import { bootstrap, BootstrapOptions } from './bootstrap'

interface MakeServerOptions extends BootstrapOptions {
  port: number
  onServerCreated?: (server: Server) => void
}

const DEFAULT_PORT = 3000

/**
 * Fireup a Local server with ormconfig and service routes.
 * 
 * @param initOrmOrConfig
 * @param serviceRoutes 
 * @param portOrOptions 
 * @returns 
 */
export const makeServer = async (initOrmOrConfig: MikroORMOptions | (() => Promise<MikroORM>), serviceRoutes: Router, portOrOptions: number | Partial<MakeServerOptions> = DEFAULT_PORT): Promise<Koa> => {
  const opts = ((): Partial<MakeServerOptions> & { port: number } => {
    if (typeof portOrOptions === 'number' || typeof portOrOptions === 'string') {
      return { port: +`${portOrOptions}` || DEFAULT_PORT }
    }
    return {
      port: DEFAULT_PORT,
      ...portOrOptions,
    }
  })()

  const app = await bootstrap(initOrmOrConfig, serviceRoutes, opts)

  // Completed
  const sv = app.listen(opts.port, '0.0.0.0', () => {
    console.log('Service is now listening for requests on port', opts.port)
  })

  // Server creation hook
  opts.onServerCreated && opts.onServerCreated(sv)

  return app
}