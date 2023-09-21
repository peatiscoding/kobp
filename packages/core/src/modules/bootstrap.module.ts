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

  private allowedBodyTypes: string[]

  constructor(allowedBodyTypes?: string[]) {
    this.allowedBodyTypes = ((): string[] => {
    if (allowedBodyTypes) {
        return allowedBodyTypes
      }
      return `${(process.env.KOBP_ALLOWED_BODY_TYPES || 'json,form')}`.trim().split(',').filter(Boolean)
    })()
  }

  public customization(): KobpCustomization {
    return {
      onInit: async () => {
      },
      middlewares: (app) => {
        app.use(bodyParser({
          enableTypes: this.allowedBodyTypes,
          // TODO: Enhance this to use Function instead.
          jsonLimit: '5mb',
          textLimit: '5mb',
          xmlLimit: '5mb',
          formLimit: '5mb',
        }))
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
