import type { MikroORM, EntityManager } from '@mikro-orm/core'

/**
 * Exported so that it can be augmented.
 */
export interface ORMDepdencyInjection {
  orm: MikroORM
  em: EntityManager
}

/**
 * Use this DI to resolve for `orm` or `em`.
 */
export const DI = {} as ORMDepdencyInjection

/**
 * Will be used privately. You should never call this method.
 * 
 * @param orm 
 * @returns 
 */
export const createDI = (orm: MikroORM): ORMDepdencyInjection => {
  DI.orm = orm
  DI.em = DI.orm.em
  return DI
}
