import type { KobpCustomization } from '../bootstrap'
import type { KobpModule, PrintFn } from '..'

import bodyParser from 'koa-bodyparser'
import { withJson } from '../middlewares'
import {
  Loggy,          // Loggy
  Lang as _,      // Lang to force module registrations
  RequestRoomProvider,
} from '../utils'

export interface BootstrapModuleOption {
  loggyPrintFn?: PrintFn 
}

export class BootstrapModule implements KobpModule {

  private allowedBodyTypes: string[]
  private options: BootstrapModuleOption = {}

  constructor(allowedBodyTypes?: string[], options?: BootstrapModuleOption) {
    this.options = options
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
        app.use(Loggy.autoCreate('_loggy', this.options?.loggyPrintFn))
        app.use(bodyParser({
          enableTypes: this.allowedBodyTypes,
        }))
        app.use(withJson('_loggy'))
        app.use((ctx, next) => RequestRoomProvider.shared.createAsync(<any>ctx, next))
      },
      onSignalReceived: async (_signal, _app) => {
        // gracefully shutting this down. 
      },
    }
  }
}
