import type { KobpServiceContext, Middleware } from '../context'
import { KobpError, Loggy } from '..'

export type AuditMessagePipelineEventType = 'start' | 'success' | 'error'

/**
 * AuditMessage pipeline callback.
 * 
 * @param message - a original message that previous pipeline has produced.
 * @param event - the event denote what has in particular event.
 * @param context - the request's context.
 * @param error - error computed by errorPipeline.
 */
export type AuditMessagePipeline = (message: string, event: AuditMessagePipelineEventType, context: KobpServiceContext, error?: Error) => string

const WithJson = () => {
  const config: {
    /**
     * Ideal place to wrap the error before it emit via reponse.json()
     */
    errorPipeline: ((err: any, loggy?: Loggy) => Error)[]

    /**
     * Run 2 times per API call.
     * 
     * - First when API has been first called: event = 'start'
     * - Second when API has deem service will returns which can be either: event = 'success' or 'error'
     */
    auditMessagePipeline: AuditMessagePipeline[]

    /**
     * path that this middleware should ignored.
     * Default to `/healthcheck`
     */
    suppressPath: string
  } = {
    auditMessagePipeline: [],
    errorPipeline: [],
    suppressPath: `${process.env.KOBP_JSON_SILENT_PATH || ''}` || '/healthcheck'
  }

  const middleware = (loggyContextKey: string): Middleware => {
    // Assign logger if needed.
    const suppressPathPattern = new RegExp(config.suppressPath, 'i')
    return async function(ctx, next) {
      const url = ctx.request.url
      const loggy = suppressPathPattern.test(url) ? null : ctx[loggyContextKey]
      const auditMessage = (event: AuditMessagePipelineEventType, error?: Error): string => {
        const httpStatus = event === 'start' ? '' : `${ctx.response?.status || ''}`
        let msg = `${ctx.request.method} ${url} ${httpStatus}`
        for(const pipe of config.auditMessagePipeline || []) {
          msg = pipe(msg, event, ctx, error)
        }
        return msg
      }
      try {
        loggy?.log(`[<<] ${auditMessage('start')}`)
        await next()
        loggy?.success(`[>>] ${auditMessage('success')}`)
      } catch (err) {
        // will only respond with JSON
        let _err = err
        if (config.errorPipeline) {
          for(const pipe of config.errorPipeline) {
            _err = pipe(_err, loggy)
          }
        }
        ctx.status = _err.statusCode || _err.status || 500;
        ctx.body = {
          success: false,
          code: _err.code && _err.code,
          error: _err.message,
          data: _err.data,
          type: _err instanceof KobpError ? 'kobp' : undefined,
        };
        // Always logs error case
        ctx._loggy?.failed(`[>>] ${auditMessage('error', _err)}`, _err)
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