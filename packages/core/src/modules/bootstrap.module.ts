import type { KobpCustomization } from '../bootstrap'
import type { KobpModule } from '..'

import bodyParser from 'koa-bodyparser'
import { withJson } from '../middlewares'
import {
  Loggy as _l,    // Loggy to force module registrations
  Lang as _,      // Lang to force module registrations
  RequestRoomProvider,
} from '../utils'

export class BootstrapModule implements KobpModule {

  private bodyParserOptions: bodyParser.Options

  public constructor(opts?: string[] | (() => bodyParser.Options)) {
    if (opts && typeof opts === 'function') {
      this.bodyParserOptions = opts()
    } else {
      const resolveAllowedBodyTypes = ((): string[] => {
        if (opts && Array.isArray(opts)) {
          return opts
        }
        return `${(process.env.KOBP_ALLOWED_BODY_TYPES || 'json,form')}`.trim().split(',').filter(Boolean)
      })

      this.bodyParserOptions = {
        enableTypes: resolveAllowedBodyTypes(),
        // Enhance this to use Function instead.
        jsonLimit: '10mb',
        textLimit: '10mb',
        xmlLimit: '10mb',
        formLimit: '10mb',
      }
    }
  }

  /**
   * Override this function to provide the customized module
   */
  public customization(): KobpCustomization {
    return {
      onInit: async () => {
      },
      middlewares: (app) => {
        app.use(bodyParser(this.bodyParserOptions))
        // automatically create the required instances.
        app.use((ctx, next) => RequestRoomProvider.shared.createAsync(<any>ctx, next))
        // withJson will have no access to Loggy!
        app.use(withJson())
      },
      onSignalReceived: async (_signal, _app) => {
        // gracefully shutting this down. 
      },
    }
  }
}
