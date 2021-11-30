import { MikroORM } from "@mikro-orm/core"
import { DI } from "../../../../src"
import { makeDbConfig } from "../../orm.config"

export const prepareDependencies = async (): Promise<any> => {
  if (!DI.orm) { 
    const orm: MikroORM = await makeDbConfig() // CLI config will be used automatically
    DI.orm = orm as any
    DI.em = DI.orm.em
  }
  return DI
}
