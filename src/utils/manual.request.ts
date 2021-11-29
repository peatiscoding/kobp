import { RequestContext } from "@mikro-orm/core"
import { Loggy } from "."
import { DI } from ".."

export const fork = (handler: () => Promise<void>) => {
  RequestContext.create(DI.em, async () => {
    Loggy.bind()
    Loggy.log('[>>] begin')
    await handler()
    Loggy.log('[<<] finished')
  })
}