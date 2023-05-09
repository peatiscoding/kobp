// server.ts
import {
  BootstrapLoader,
  BootstrapModule,
  KobpServiceContext,
  KobpServiceState,
} from 'kobp'
import Router from 'koa-router'
import { HelloController } from './controllers/hello.controller'


const makeRoutes = (): Router => {
  const api = new Router<KobpServiceState, KobpServiceContext>()
  api.use('/hello', ...new HelloController().getMiddlewares() as any)
  return api
}

// Finally
async function init () {
  const PORT = +(process.env.PORT || 3000)

  const loader = new BootstrapLoader()
  const app = await loader
    .addModule(new BootstrapModule(['json']))
    .build(makeRoutes(), {}) // returns Koa App

  app.listen(PORT, '0.0.0.0')
  console.log('Server started listening on', PORT)
}

init()
