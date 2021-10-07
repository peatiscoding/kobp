import { RequestContext } from '@mikro-orm/core'
import type { Middleware } from 'koa'

export const withLanguage = (headerKey: string = 'x-lang', defaultLangSymbol = 'en'): Middleware => {
  return async function (ctx, next) {
    const lang = `${ctx.request.headers[headerKey] || ''}` || defaultLangSymbol
    const crc = <any>RequestContext.currentRequestContext()
    crc.lang = lang
    ctx.lang = lang
    await next()
  }
}