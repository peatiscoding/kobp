// server.ts
import {
  BootstrapLoader,
  BootstrapModule,
} from 'kobp'
import { makeRoutes } from "./routes"

const PORT = +(process.env.PORT || 9000)

// Finally
const run = async () => {
  const loader = new BootstrapLoader()
  const app = await loader
    .addModule(new BootstrapModule(['json']))
    .build(makeRoutes(), {}) // returns Koa App
  
  app.listen(PORT, '0.0.0.0')
  console.log('Server started listening on', PORT)
}

run()