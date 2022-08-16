import { randomBytes } from 'crypto'
import { KobpServiceContext } from '..'


export interface TracerConfig {

  /**
   * By default tracer will always prefers `x-tracerId` explicitly provided in the request header.
   * If not provided. It will fallback to use `traceIdMaker()` to create one.
   * 
   * Default to `x-traceId`
   */
  requestTraceHeaderKey: string

  /**
   * Default to `<timestamp(radix:32)> + '.' + <random(4bytes).hex>.substr(4)`
   */
  traceIdMaker: (currentKey: string) => string
}

/**
 * Tracer Usage
 * 
 * Extends this class. And initialize this with beforeFork middlewares
 * 
 * Example:
 * ```ts
 * 
 * class CustomTracer extends Tracer {
 *    ** my own functions **
 * }
 * 
 * makeServer(
 *    ...,
 *    {
 *        middlewareBeforeFork: (app) => {
 *            app.use((ctx, next) => {
 *                ctx.tracer = new CustomTracer(ctx)
 *                await next()
 *            })
 *        },
 *        middlewareAfterFork: (app) => {
 *          app.use(Tracer.attach('tracer'))
 *        }
 *    }
 * )
 * ```
 */
export class Tracer {

  public static _config: TracerConfig = {
    requestTraceHeaderKey: 'x-trace-id',
    traceIdMaker: (currentKey: string) => {
      // Stack key when current ray run through multiple services.
      if (!currentKey) {
        return `${new Date().getTime().toString(32)}.${randomBytes(4).toString('hex').substr(0, 4)}`
      }
      return `${currentKey}>${randomBytes(4).toString('hex').substr(0, 4)}`
    }
  }

  /**
   * Update tracer's configuration. You should call this only once.
   * 
   * @param config
   */
  public static config(config: Partial<TracerConfig>): void {
    this._config = {
      ...this._config,
      ...config
    }
  }

  public readonly traceId: string
  public readonly context: KobpServiceContext

  constructor(ctx: KobpServiceContext) {
    const config = Tracer._config
    const fromHeader = ctx.request.headers[config.requestTraceHeaderKey]
    const sanitized = (typeof fromHeader === 'string' ? fromHeader : (fromHeader && fromHeader.length > 0 && fromHeader[0] || ''))
    this.traceId = config.traceIdMaker(sanitized)
    this.context = ctx
    this.context.traceId = this.traceId
  }
}