import { KobpServiceContext } from '..'
import type { Middleware } from '../context'

const WithJson = () => {
  const config: {
    /**
     * Ideal place to wrap the error before it emit via reponse.json()
     */
    errorPipeline: ((ctx: KobpServiceContext, err: any) => Error)[]

    /**
     * 
     */
    suppressPath: string
  } = {
    errorPipeline: [],
    suppressPath: `${process.env.KOBP_JSON_SILENT_PATH || ''}` || '/healthcheck'
  }

  const middleware = (): Middleware => {
    // Assign logger if needed.
    const suppressPathPattern = new RegExp(config.suppressPath, 'i')
    return async function(ctx, next) {
      const url = ctx.request.url
      const loggy = suppressPathPattern.test(url) ? null : ctx._loggy
      try {
        loggy?.log(`[<<] ${url}`)
        await next()
        loggy?.success(`[>>] ${url}`)
      } catch (err) {
        // will only respond with JSON
        let _err = err
        if (config.errorPipeline) {
          for(const pipe of config.errorPipeline) {
            _err = pipe(ctx, _err)
          }
        }
        ctx.status = _err.statusCode || _err.status || 500;
        ctx.body = {
          success: false,
          code: _err.code && _err.code,
          error: _err.message,
          data: _err.data,
        };
        // Always logs error case
        ctx._loggy?.failed(`[>>] ${url}`, _err)
      }
    }
  }

  return {
    config,
    middleware,
  }
}

const instance = WithJson()

export const withJson = instance.middleware
export const withJsonConfig = instance.config