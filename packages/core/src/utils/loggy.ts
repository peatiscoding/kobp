import type { Logger } from '.'
import { Middleware } from 'koa'
import { KobpServiceContext } from '..'
import { RequestContextEnabled, RequestRoomProvider } from './RequestContext'
import { Tracer } from './tracer'
import get from 'lodash/get'

const _stringify = (o: any) => (typeof o === 'string' || typeof o === 'number' ? `${o}` : JSON.stringify(o))

export interface PrintContent {
  requestId: string
  user: any
  ip: string[]
  path: string
  version: string
  platform: string
  app: string
  method: string
  statusCode: string | number
  message?: string
  error?: string
  // OK, ERROR, IN-PROGRESS
  verdict: 'OK' | 'ER' | 'PG'
}

export type PrintFn = (content: PrintContent) => void

export type GetUserFn = (context: KobpServiceContext) => string | undefined

@RequestContextEnabled('__TRC__')
export class Loggy extends Tracer implements Logger {
  public static format: 'JSN' | 'TXT' = /JSO?N/i.test(`${process.env.LOGGY_FORMAT || 'JSN'}`) ? 'JSN' : 'TXT'
  public static userContextKeyPath: string = `${process.env.LOGGY_USER_CONTEXT_KEY_PATH || 'user.id'}`

  public static customPrintLn?: PrintFn = undefined
  public static getUserFn?: GetUserFn = undefined

  /**
   * Configurable via:
   *
   * 1. Static Function of `Loggy.customPrintLn`
   * 1. Otherwise, it will use the environment `LOGGY_FORMAT` to decided the format.
   */
  private _printLn: PrintFn

  /**
   * Configurable via:
   *
   * 1. Static function of `Loggy.getUserFn` (get user's key from context)
   * 1. Otherwise, it will use the environment `LOGGY_USER_CONTEXT_KEY_PATH` which is the lodash's "get" argument key paths.
   */
  private _getUser: GetUserFn

  constructor(ctx: KobpServiceContext) {
    super(ctx)
    this._printLn =
      Loggy.customPrintLn ??
      (Loggy.format === 'JSN'
        ? (c) => console.log(JSON.stringify(c))
        : (c) =>
            console.log(
              `${c.requestId} [${c.verdict} ${c.statusCode}] ${c.user} ${c.method} ${c.path}`,
              [c.message, c.error].filter(Boolean).join(' '),
            ))
    this._getUser = Loggy.getUserFn ?? ((ctx) => get(ctx, Loggy.userContextKeyPath || 'user.id'))
  }

  /**
   * Override the print function
   */
  public setPrintFn(printLn: PrintFn) {
    this._printLn = printLn
  }

  success(...messageParts: any[]): void {
    this._print({ finalized: true, message: messageParts.map((o) => _stringify(o)).join(' ') })
  }

  failed(message: string, error?: string | Error): void {
    this._print({ finalized: true, message, error: error || '(no-error-message)' })
  }

  log(...messageParts: any[]): void {
    this._print({ finalized: false, message: messageParts.map((o) => _stringify(o)).join(' ') })
  }

  error(message: string, error?: string | Error): void {
    this._print({ finalized: false, message, error: error || '(no-error-message)' })
  }

  private _print(msg: { finalized: boolean; message?: string; error?: string | Error }) {
    const { error, message, finalized } = msg
    const ctx = this.context
    const headers = ctx.headers || {}
    const errorMessage = (typeof error === 'string' && error) || (typeof error === 'object' && error.message) || ''
    const ip = [...(ctx.ips || []), ctx.ip].filter(Boolean)
    const path = ctx.request?.url
    const method = ctx.request?.method
    const user = this._getUser(ctx) || ''
    const statusCode = ctx.res.statusCode
    const version = `${headers['x-version'] || ''}`
    const app = `${headers['x-app'] || ''}`
    const platform = `${headers['x-platform'] || ''}`
    const payload: PrintContent = {
      requestId: this.traceId,
      user: user || null,
      app,
      version,
      platform,
      ip,
      path,
      method,
      statusCode: finalized ? statusCode : '000', // pending
      message: message || undefined,
      error: errorMessage || undefined,
      verdict: finalized ? (!error ? 'OK' : 'ER') : 'PG',
    }
    this._printLn(payload)
  }

  // Usage
  static log(...messageParts: any[]) {
    const loggy = RequestRoomProvider.instanceOf(this)
    if (!loggy) {
      console.log(...messageParts)
    } else {
      loggy.log(...messageParts)
    }
  }

  // Usage
  static error(message: string, error?: string | Error) {
    const loggy = RequestRoomProvider.instanceOf(this)
    if (!loggy) {
      console.error(message, error)
    } else {
      loggy.error(message, error)
    }
  }

  static current(): Loggy {
    const loggy = RequestRoomProvider.instanceOf(this)
    return loggy
  }

  /**
   * the dirty way to prematurly create the Loggy instance manually via middleware
   * so that the instance is being ready before the RequestContext is ready.
   */
  static autoCreate(attachToContextKey: string): Middleware {
    return async function (ctx, next) {
      const loggy = new Loggy(ctx as any)
      ctx[attachToContextKey] = loggy
      await next()
    }
  }
}
