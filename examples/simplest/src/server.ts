// server.ts
import {
  BootstrapLoader,
  BootstrapModule,
  Loggy,
} from 'kobp'
import { makeRoutes } from "./routes"

const CUSTOM_CORRELATION_ID_HEADER_KEY = 'x-correlation-id'

// override configurations
Loggy.customPrintLn = (content) => {
  console.log(`custom: ${JSON.stringify(content)}`)
}

// override Tracer's cofiguration
Loggy._config = {
  ...Loggy._config,
  requestTraceHeaderKey: CUSTOM_CORRELATION_ID_HEADER_KEY,
}

// Finally
async function init () {
  const PORT = +(process.env.PORT || 9000)

  const loader = new BootstrapLoader()
  const app = await loader
    .addModule(new BootstrapModule(['json']))
    .build(makeRoutes(), {
      middlewares: (koa) => {
        koa.use(async (ctx, next) => {
          ctx.set(CUSTOM_CORRELATION_ID_HEADER_KEY, Loggy.current().traceId)
          await next()
        })
      }
    }) // returns Koa App

  app.listen(PORT, '0.0.0.0')
  console.log('Server started listening on', PORT)
}

init()
