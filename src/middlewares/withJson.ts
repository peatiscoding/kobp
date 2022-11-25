import type { Middleware } from '../context'
import { KobpError, Loggy } from '..'
import { Tracer } from '../utils/tracer'

const WithJson = () => {
  const config: {
    /**
     * Ideal place to wrap the error before it emit via reponse.json()
     */
    errorPipeline: ((err: any, loggy?: Loggy) => Error)[]

    /**
     * 
     */
    suppressPath: string
  } = {
    errorPipeline: [],
    suppressPath: `${process.env.KOBP_JSON_SILENT_PATH || ''}` || '/healthcheck'
  }

  const middleware = (loggyContextKey: string): Middleware => {
    // Assign logger if needed.
    const suppressPathPattern = new RegExp(config.suppressPath, 'i')
    return async function(ctx, next) {
      const url = ctx.request.url
      const loggy = suppressPathPattern.test(url) ? null : ctx[loggyContextKey]
      try {
        loggy?.log(`[<<] ${url}`)
        await next()
        loggy?.success(`[>>] ${url}`)
      } catch (err) {
        // will only respond with JSON
        const traceId = Tracer.current()?.traceId || '<no-trace-id>'
        let _err = err
        if (config.errorPipeline) {
          for(const pipe of config.errorPipeline) {
            _err = pipe(_err, loggy)
          }
        }
        ctx.status = _err.statusCode || _err.status || 500;
        ctx.body = {
          success: false,
          traceId,
          code: _err.code && _err.code,
          error: _err.message,
          data: _err.data,
          type: _err instanceof KobpError ? 'kobp' : undefined,
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