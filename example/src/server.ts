import {
  BootstrapLoader,
  BootstrapModule,
  KobpError,
  Loggy,
  ServerErrorCode,
  withJsonConfig,
} from 'kobp'
import { MikroormModule } from 'kobp-mikroorm'

import { makeDbConfig } from "./orm.config"
import { makeRoutes } from "./routes"


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
const run = async () => {
  const loader = new BootstrapLoader()
  const app = await loader
    .addModule(new BootstrapModule(['json']))
    .addModule(new MikroormModule(makeDbConfig))
    .build(makeRoutes(), {})
  
  app.listen(3456, '0.0.0.0')
}

run()
