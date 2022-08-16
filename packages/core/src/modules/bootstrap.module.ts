import type { KobpCustomization } from '../bootstrap'
import type { KobpModule } from '..'

import bodyParser from 'koa-bodyparser'
import { withJson } from '../middlewares'
import {
  Loggy,          // Loggy
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

  public async customization(): Promise<KobpCustomization> {
    return {
      onInit: async () => {
        console.log('Bootstrap Module initialized.')
      },
      middlewares: (app) => {
        app.use(Loggy.autoCreate('_loggy'))
        app.use(withJson('_loggy'))
        app.use(bodyParser({
          enableTypes: this.allowedBodyTypes,
        }))
        app.use((ctx, next) => RequestRoomProvider.shared.createAsync(<any>ctx, next))
      },
    }
  }
}