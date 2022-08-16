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
}

const compileCustomization = (options: KobpCustomization[]): KobpCustomization => {
  const allOpts = options
  return {
    onInit: async () => {
      for(const opt of allOpts) {
        if (opt.onInit) {
          await opt.onInit()
        }
      }
    },
    onAppCreated: (app: Koa) => {
      for(const opt of allOpts) {
        if (opt.onAppCreated) {
          opt.onAppCreated(app)
        }
      }
    },
    middlewares: (app: Koa) => {
      for(const opt of allOpts) {
        if (opt.middlewares) {
          opt.middlewares(app)
        }
      }
    }
  }
}

export interface KobpModule {
  customization(): Promise<KobpCustomization>
}

export class BootstrapLoader {

  private modules: KobpModule[] = []

  public addModule(module: KobpModule): this {
    this.modules.push(module)
    return this
  }

  public async build(serviceRoutes: Router, appCustomization: KobpCustomization): Promise<Koa> {
    const opts = compileCustomization([
      ...(await Promise.all(this.modules.map((o) => o.customization()))),
      appCustomization,
    ])

    await opts.onInit()

    // Actual Bootstraping
    const app = new Koa()
    
    // Fork
    opts.middlewares && opts.middlewares(app)

    // Register actual application
    app.use(serviceRoutes.routes())
    app.use(serviceRoutes.allowedMethods())

    opts.onAppCreated && opts.onAppCreated(app)

    return app
  }
}