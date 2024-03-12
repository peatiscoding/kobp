import { BootstrapLoader, BootstrapModule, KobpError, Loggy, ServerErrorCode, withJsonConfig } from 'kobp'
import { DI, MikroormModule } from 'kobp-mikroorm'

import { makeDbConfig } from './orm.config'
import { makeRoutes } from './routes'

async function init() {
  // Override withJsonError handling
  const errorMapper = (err: any, loggy?: Loggy): Error => {
    if (err instanceof KobpError) {
      return err
    }
    console.error(err)
    // for any Non-Kobp error wrap it.
    Loggy.error('*Wrapped* Internal Server Error: ', err)
    // Produce simple error message;
    return KobpError.fromServer(ServerErrorCode.internalServerError, 'Internal Server Error', {
      traceId: loggy?.traceId,
    })
  }
  withJsonConfig.errorPipeline.push(errorMapper)

  // Finally
  const loader = new BootstrapLoader()
  const app = await loader
    .addModule(new BootstrapModule(['json']))
    .addModule(new MikroormModule(makeDbConfig))
    .build(makeRoutes(), {})

  app.listen(3456, '0.0.0.0')
}

init()
