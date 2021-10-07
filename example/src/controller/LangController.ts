import { RequestContext } from '@mikro-orm/core'
import { BaseRoutedController, KobpServiceContext, RouteMap } from '../../../src'
import { withLanguage } from '../middlewares/withLanguage'

export class LangController extends BaseRoutedController {

  constructor() {
    super()
  }

  public getRouteMaps(): RouteMap {
    return {
      ...super.getRouteMaps(),
      get: {
        method: 'get',
        path: '/delay/:seconds',
        middlewares: [
          withLanguage('x-lang', 'en') as any,
        ]
      }
    }
  }

  public async get(context: KobpServiceContext): Promise<{ di: { before: string, after: string }, context: { before: string, after: string } }> {
    const dt = <any>RequestContext.currentRequestContext()
    const before = dt.lang
    const beforeCtx = context.lang
    await new Promise((resolve) => setTimeout(resolve, +context.params.seconds * 1000))
    const after = dt.lang
    const afterCtx = context.lang
    return {
      di: {
        before,
        after,
      },
      context: {
        before: beforeCtx,
        after: afterCtx,
      }
    }
  }
}