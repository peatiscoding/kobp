import { Middleware } from 'koa'
import type { Logger } from '.'
import { KobpServiceContext } from '..'
import { Tracer } from './tracer'

const _stringify = (o: any) => (typeof o === 'string' || typeof o === 'number') ? `${o}` : JSON.stringify(o)

interface PrintContent {
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

export class Loggy extends Tracer implements Logger {

  public static format: 'JSN' | 'TXT' = /JSO?N/i.test(`${process.env.LOGGY_FORMAT || 'JSN'}`) ? 'JSN' : 'TXT'

  private _printLn: (content: PrintContent) => void

  constructor(ctx: KobpServiceContext) {
    super(ctx)
    this._printLn = Loggy.format === 'JSN'
      ? (c) => console.log(JSON.stringify(c))
      : (c) => console.log(`${c.requestId} [${c.verdict} ${c.statusCode}] ${c.method} ${c.path}`, [c.message, c.error].filter(Boolean).join(' '))
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

  private _print(msg: { finalized: boolean, message?: string, error?: string | Error }) {
    const { error, message, finalized } = msg
    const ctx = this.context
    const headers = ctx.headers || {}
    const errorMessage = (typeof error === 'string' && error) || (typeof error === 'object' && error.message) || ''
    const ip = [...ctx.ips || [], ctx.ip].filter(Boolean)
    const path = ctx.request?.url
    const method = ctx.request?.method
    const user = ctx.user?.id
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
    const loggy = Tracer.current<Loggy>()
    if (!loggy) {
      console.log(...messageParts)
    } else {
      loggy.log(...messageParts)
    }
  }

  // Usage
  static error(message: string, error?: string | Error) {
    const loggy = Tracer.current<Loggy>()
    if (!loggy) {
      console.error(message, error)
    } else {
      loggy.error(message, error)
    }
  }

  static autoCreate(attachToContextKey: string): Middleware {
    return async function (ctx, next) {
      ctx[attachToContextKey] = new Loggy(ctx as any)
      await next()
    }
  }
}