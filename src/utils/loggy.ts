import { RequestContext } from '@mikro-orm/core'
import { randomBytes } from 'crypto'
import { Middleware } from 'koa'
import { KobpServiceContext } from '..'

export class Loggy {

  public static requestIdContextKey = 'traceId'

  public readonly requestId!: string

  constructor(private ctx: KobpServiceContext) {
    this.requestId = ctx[Loggy.requestIdContextKey] || `${new Date().getTime().toString(32)}.${randomBytes(4).toString('hex').substr(0, 4)}`
  }

  private log(...messageParts: string[]) {
    this._print({ message: messageParts.map((o) => o).join(' ') })
  }

  private error(message: string, error?: string | Error) {
    this._print({ message, error: error || '(no-error-message)' })
  }

  private _print(msg: { message?: string, error?: string | Error }) {
    const { error, message } = msg
    const errorMessage = (typeof error === 'string' && error) || (typeof error === 'object' && error.message) || ''
    const ip = [...this.ctx.ips, this.ctx.ip]
    const path = this.ctx.request.url
    const method = this.ctx.request.method
    const user = this.ctx.user?.id
    const statusCode = this.ctx.res.statusCode
    const payload = {
      requestId: this.requestId,
      user: user || null,
      ip,
      path,
      method,
      statusCode,
      message: message || undefined,
      error: errorMessage || undefined,
    }
    console.log(JSON.stringify(payload))
  }

  // Usage
  static log(...messageParts: string[]) {
    const crc = <any>RequestContext.currentRequestContext()
    const loggy: Loggy = crc?.loggy
    if (!loggy) {
      console.log(...messageParts)
    } else {
      loggy.log(...messageParts)
    }
  }

  // Usage
  static error(message: string, error?: string | Error) {
    const crc = <any>RequestContext.currentRequestContext()
    const loggy: Loggy = crc?.loggy
    if (!loggy) {
      console.error(message, error)
    } else {
      loggy.error(message, error)
    }
  }

  /**
   * Middleware for trapping
   * 
   * Silently initiate current request context association.
   * Allow current request context to holds single loggy instead.
   * 
   * Therefore author can just use Loggy.log() through out the app without worrying about the instance of current request.
   * 
   * @param context 
   */
  static trap(): Middleware {
    return async function (ctx, next) {
      console.log('CTX', ctx)
      const crc = <any>RequestContext.currentRequestContext()
      crc.loggy = new Loggy(ctx as any)
      await next()
    }
  }
}