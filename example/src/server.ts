import { makeDbConfig } from "./orm.config"
import { makeRoutes } from "./routes"

import { KobpError, Loggy, makeServer, ServerErrorCode, withJsonConfig } from "../../src"

// Override withJsonError handling
withJsonConfig.errorPipeline.push(
  (err: any, loggy?: Loggy): Error => {
    if (err instanceof KobpError) {
      return err
    }
    // for any Non-Kobp error wrap it.
    Loggy.error('*Wrapped* Internal Server Error: ', err)
    // Produce simple error message;
    return KobpError.fromServer(ServerErrorCode.internalServerError, 'Internal Server Error', {
      traceId: loggy?.traceId
    })
  }
)

// Finally
makeServer(
  makeDbConfig as any,
  makeRoutes(),
  {
    port: 3456,
  },
)
