import { RequestContext } from '@mikro-orm/core'
import { Middleware } from 'koa'

export class Lang {

  public static requestHeaderLanguageKey = 'x-lang'
  public static defaultLangSymbol = 'en'

  public static current(fallback: string = ''): string {
    const crc = <any>RequestContext.currentRequestContext()
    return crc?.lang || fallback || Lang.defaultLangSymbol
  }

  public static attach(): Middleware {
    return async function(ctx, next) {
      const lang = `${ctx.request.headers[Lang.requestHeaderLanguageKey] || ''}`
      const crc = <any>RequestContext.currentRequestContext()
      crc.lang = lang
      ctx.lang = lang
      await next()
    }
  }
}