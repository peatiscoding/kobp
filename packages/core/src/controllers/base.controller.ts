import type { KobpServiceContext, KobpServiceState } from '../context'

import { Middleware } from 'koa'
import Router from 'koa-router'

export type HttpMethod = 'post'|'get'|'delete'|'put'|'patch'

export interface RouteMapMeta {
  method: HttpMethod | HttpMethod[]
  path?: string
  middlewares?: Middleware[]
}

export interface RouteMap {
  [key: string]: RouteMapMeta
}

export class KobpRouter extends Router<KobpServiceState, KobpServiceContext> {
}

export class BaseRoutedController {

  constructor(protected allRoutesMiddlewares: Middleware[] = []) {
  }

  getRouteMaps(): RouteMap {
    return {
      ...((<any>this).__drm || {}), /* will be injected from decorators package */
    }
  }

  async handleSuccess(ctx: KobpServiceContext, data: any): Promise<void> {
    ctx.status = 200
    ctx.body = {
      success: true,
      data
    }
  }

  /**
   * Counter path of getRouter(). Use this method to register the controller to given router.
   * 
   * @param path 
   * @param koaRouter 
   */
  public register(path: string, koaRouter: KobpRouter, ...middlewares: Router.IMiddleware<KobpServiceState, KobpServiceContext>[]) {
    const r = this.getRouter()
    koaRouter.use(path, ...middlewares, r.routes(), r.allowedMethods())
  }

  public getRouter(): KobpRouter {
    const router = new KobpRouter()
    const map = this.getRouteMaps()
    for(const fname in map) {
      let { method, path } = map[fname]
      const { middlewares } = map[fname]
      path = path || `/${fname}`
      if (typeof method === 'string') {
        method = [method]
      }
      for(const _m of method) {
        const mw = [...this.allRoutesMiddlewares, ...(middlewares || [])]
        for(let i = 0; i < mw.length; i += 1) {
          router[_m](path, mw[i])
        }
        router[_m](path, async (ctx, next): Promise<void> => {
          try {
            const out = await this[fname || 'index'](ctx)
            const res = ctx.response
            if (!(res as any).doNotHandleSuccess) {
              await this.handleSuccess(ctx, out)
            }
          } catch(error) {
            ctx.throw(error)
          }
        })
      }
    }
    return router
  }

  public getMiddlewares(): Router.IMiddleware<KobpServiceState, KobpServiceContext>[] {
    const r = this.getRouter()
    return [r.routes(), r.allowedMethods()]
  }
}
