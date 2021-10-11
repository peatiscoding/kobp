import type { Middleware } from '../context'

export const withJson = (): Middleware => {
  // Assign logger if needed.
  const suppressPath = process.env.KOBP_JSON_SILENT_PATH || '/healthcheck'
  const suppressPathPattern = new RegExp(suppressPath, 'i')
  return async function(ctx, next) {
    const url = ctx.request.url
    const loggy = suppressPathPattern.test(url) ? null : ctx._loggy
    try {
      loggy?.log(`[<<] ${url}`)
      await next()
      loggy?.success(`[>>] ${url}`)
    } catch (err) {
      // will only respond with JSON
      ctx.status = err.statusCode || err.status || 500;
      ctx.body = {
        success: false,
        code: err.code && err.code,
        error: err.message,
        data: err.data,
      };
      // Always logs error case
      ctx._loggy?.failed(`[>>] ${url}`, err)
    }
  }
}