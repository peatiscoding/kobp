import type { Middleware } from '../context'

export const withJson = (): Middleware => async (ctx, next) => {
  // Assign logger if needed.
  try {
    ctx._loggy?.log(`[<<] ${ctx.request.url}`)
    await next()
    ctx._loggy?.success(`[>>] ${ctx.request.url}`)
  } catch (err) {
    // will only respond with JSON
    ctx.status = err.statusCode || err.status || 500;
    ctx.body = {
      success: false,
      code: err.code && err.code,
      error: err.message,
      data: err.data,
    };
    ctx._loggy?.failed(`[>>] ${ctx.request.url}`, err)
  }
}