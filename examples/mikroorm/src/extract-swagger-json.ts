import { makeRoutes } from './routes'
import { OpenApiBuilder } from 'openapi3-ts/oas31'
import { deriveApiSpec } from 'kobp'
import { makeDbConfig } from './orm.config'

const run = async () => {
  await makeDbConfig()
  const router = makeRoutes() as any
  const builder = new OpenApiBuilder()
  const apiSpec = deriveApiSpec(
    'simplest example API',
    {
      servers: [],
    },
    builder,
    router,
  )
  apiSpec
  process.stdout.write(JSON.stringify(apiSpec))

  process.exit(0)
}

run()
