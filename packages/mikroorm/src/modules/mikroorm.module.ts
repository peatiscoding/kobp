import type {
  KobpCustomization,
  KobpModule,
} from 'kobp'

import {
  MikroORM,
  MikroORMOptions,
  RequestContext,
} from '@mikro-orm/core'

import { isFunction } from 'lodash'
import { createDI, DI } from '../di'

export class MikroormModule implements KobpModule {

  constructor(protected initOrmOrConfig: MikroORMOptions | (() => Promise<MikroORM>)) {
  }

  public customization(): KobpCustomization {
    return {
      onInit: async () => {
        const orm = isFunction(this.initOrmOrConfig)
          ? await this.initOrmOrConfig()
          : await MikroORM.init(this.initOrmOrConfig)
        createDI(orm)
      },
      middlewares: async (app) => {
        app.use((ctx, next) => RequestContext.createAsync(DI.orm.em, next))
      },
    }
  }
}