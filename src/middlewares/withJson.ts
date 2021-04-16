import type { KobpServiceContext, Middleware } from '../context'
import { randomBytes } from 'crypto'
import { Logger } from '../utils/logger'

const wrapLogger = (prefix: string, logger: Logger): Logger | undefined => {
  if (!logger) {
    return undefined
  }
  return {
    log: (...args) => { logger.log(prefix, ...args) },
    error: (...args) => { logger.log(prefix, ...args) },
  }
}

export const withJson = (logger?: Logger, trace?: (ctx: KobpServiceContext) => string): Middleware => async (ctx, next) => {
  // Assign logger if needed.
  try {
    let traceId = trace && trace(ctx) || `${new Date().getTime().toString(32)}.${randomBytes(4).toString('hex').substr(0, 4)}`
    ctx.logger = wrapLogger(traceId, logger)
    ctx.logger?.log(`[<<] ${ctx.request.url}`)
    await next()
    ctx.logger?.log(`[>>] ${ctx.request.url} ${ctx.res.statusCode}`)
  } catch (err) {
    // will only respond with JSON
    ctx.status = err.statusCode || err.status || 500;
    ctx.body = {
      success: false,
      code: err.code && err.code,
      error: err.message,
      data: err.data,
    };
    ctx.logger?.error(`[>>] E code=${err.code && err.code || ''} message=${err.message || ''} data=${err.data && JSON.stringify(err.data) || ''}`)
    ctx.logger?.error(`[>>] ${ctx.request.url} ${ctx.res.statusCode}`)
  }
}