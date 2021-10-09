import { makeDbConfig } from "./orm.config"
import { makeRoutes } from "./routes"

import { makeServer } from "../../src"

// Finally
makeServer(
  makeDbConfig as any,
  makeRoutes(),
  {
    port: 3456,
  },
)
