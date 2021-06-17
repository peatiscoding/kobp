import bodyParser from "koa-bodyparser"
import { makeDbConfig } from "./orm.config"
import { makeRoutes } from "./routes"

import { makeServer } from "../../src"

// Finally
makeServer(
  makeDbConfig,
  makeRoutes(),
  {
    port: 3456,
    middlewareBeforeFork: (app) => {
      app.use(bodyParser())
    },
  },
)
