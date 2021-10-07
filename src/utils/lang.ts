import { RequestContext } from '@mikro-orm/core'
import { Middleware } from 'koa'

export class Lang {

  static requestHeaderLanguageKey = 'x-lang'
  static defaultLangSymbol = 'en'

  current(): string {
    const crc = <any>RequestContext.currentRequestContext()
    return crc?.lang || Lang.defaultLangSymbol
  }

  static trap(): Middleware {
    return async function(ctx, next) {
      const lang = `${ctx.request.headers[Lang.requestHeaderLanguageKey] || ''}` || Lang.defaultLangSymbol
      const crc = <any>RequestContext.currentRequestContext()
      crc.lang = lang
      ctx.lang = lang
      await next()
    }
  }
}