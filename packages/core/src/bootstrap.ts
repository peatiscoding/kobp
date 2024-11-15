import type Router from 'koa-router'
import Koa from 'koa'

export interface KobpCustomization {
  /**
   * Before app is being created
   */
  onInit?: () => Promise<void>
  /**
   * After app has been created
   */
  onAppCreated?: (app: Koa) => void
  /**
   * Attach all necessary middlewares.
   */
  middlewares?: (app: Koa) => void
  /**
   * Handle signal received for graceful shutdown.
   */
  onSignalReceived?: (signal: NodeJS.Signals, app: Koa) => Promise<void>
}

const _compileCustomization = (options: KobpCustomization[]): KobpCustomization => {
  const allOpts = options
  return {
    onInit: async () => {
      for (const opt of allOpts) {
        if (opt.onInit) {
          await opt.onInit()
        }
      }
    },
    onAppCreated: (app: Koa) => {
      for (const opt of allOpts) {
        if (opt.onAppCreated) {
          opt.onAppCreated(app)
        }
      }
    },
    middlewares: (app: Koa) => {
      for (const opt of allOpts) {
        if (opt.middlewares) {
          opt.middlewares(app)
        }
      }
    },
    onSignalReceived: async (signal: NodeJS.Signals, app: Koa): Promise<void> => {
      for (const opt of allOpts) {
        if (opt.onSignalReceived) {
          await opt.onSignalReceived(signal, app)
        }
      }
    },
  }
}

export interface KobpModule {
  customization(): KobpCustomization
}

export class BootstrapLoader {
  private modules: KobpModule[] = []

  public addModule(module: KobpModule): this {
    this.modules.push(module)
    return this
  }

  /**
   * Builds Koa application.
   */
  public buildSync(serviceRoutes: Router, appCustomization: KobpCustomization): Koa {
    const opts = _compileCustomization([...this.modules.map((o) => o.customization()), appCustomization])

    // Actual Bootstraping
    const app = new Koa()

    // Fork
    let initPromise = opts.onInit()
    app.use(async (context, next) => {
      await initPromise
      await next()
    })

    this._launchKoa(serviceRoutes, app, opts)

    return app
  }

  public async build(serviceRoutes: Router, appCustomization: KobpCustomization): Promise<Koa> {
    const opts = _compileCustomization([...this.modules.map((o) => o.customization()), appCustomization])

    await opts.onInit()

    // Actual Bootstraping
    const app = new Koa()

    this._launchKoa(serviceRoutes, app, opts)

    return app
  }

  private _launchKoa(serviceRoutes: Router, koa: Koa, opts: KobpCustomization) {
    // Fork
    opts.middlewares && opts.middlewares(koa)

    // Register actual application
    koa.use(serviceRoutes.routes())
    koa.use(serviceRoutes.allowedMethods())

    opts.onAppCreated && opts.onAppCreated(koa)

    if (opts.onSignalReceived) {
      // register onSignalReceived handler.
      process.on('SIGTERM', (signal) => {
        opts
          .onSignalReceived(signal, koa)
          .then(() => {
            process.exit(0)
          })
          .catch((e) => {
            process.exit(1)
          })
      })
    }
  }
}
