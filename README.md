# Kobp

[![Node.js Package](https://github.com/peatiscoding/kobp/actions/workflows/main.yml/badge.svg)](https://github.com/peatiscoding/kobp/actions/workflows/main.yml)

Start your Koa project with necessary Boring codes.

## Install

```
npm i --save kobp

# OR

yarn kobp
```

**NOTE** we listed `koa` as our `peerDependencies` so please include the `koa` in your own codebase.

## Usage

Start your node.js TypeScript project and describe your endpoints with controller style.

To expose each method as routes. Use our built-in decorator. `Route` which accepts method, paths, and Koa's middlwares.

`controllers/hello.cotnroller.ts`

```ts
import type { KobpServiceContext } from 'kobp'
import { Route, BaseRoutedController } from 'kobp'

export class HelloController extends BaseRoutedController {

  @Route('post', '/echo')
  async migrate(context: KobpServiceContext) {
    return context.request.body
  }

  @Route()
  async index(context: KobpServiceContext) {
    return {
      hello: 'world'
    }
  }
}
```

Or you can describe your controllers in a classical way. (Avoid using decorators). This method introduce less code when it is bundled.

`controllers/hello.controller.ts`

```ts
import type { KobpServiceContext } from 'kobp'
import { RouteMap, BaseRoutedController } from 'kobp'

export class HelloController extends BasedRouteController {

  public getRouteMaps(): RouteMap {
    return {
      ...super.getRouteMaps(),
      index: { method: 'get', path: '/', middlewares: [] }, // Same as our decorator above.
    }
  }

  async index(context: KobpServiceContext) {
    return {
      hello: 'world'
    }
  }
}
```

Now to utilise this controller. Here is how we start a module.

```ts
// routes.ts
import { KobpServiceContext, KobpServiceState } from 'kobp'

import Router from 'koa-router'
import { HelloController } from 'src/controller/HelloController'

export const makeRoutes = (): Router => {
  const api = new Router<KobpServiceState, KobpServiceContext>()
  api.use('/hello', ...new HelloController().getMiddlewares() as any)
  return api
}
```

And also ...

```ts
// server.ts
import {
  BootstrapLoader,
  BootstrapModule,
} from 'kobp'
import { makeRoutes } from "./routes"

// Finally
const run = async () => {
  const loader = new BootstrapLoader()
  const app = await loader
    .addModule(new BootstrapModule(['json'])) // type of input body it should support.
    .build(makeRoutes(), {}) // returns Koa App
  
  app.listen(9005, '0.0.0.0')
}

run()
```

By the example above. You will be able to:

```bash
curl http://localhost:9005/hello/

# OR

curl -XPOST http://localhost:9005/hello/echo -H 'content-type: application/json' -d '{"some":"key","json":"value"}'
```

See other [Example](./examples/) for more info.

## Using with Lambda

```ts
import {
  BootstrapModule,
  KobpRouter,
} from 'kobp'

import { makeLambdaHandler } from 'kobp-lambda'
import { HelloController } from '@controllers/hello.controller'

const router = new KobpRouter()
new HelloController().register('/hello', router)

export default makeLambdaHandler(router, {
  customizer: (loader) => {
    loader.addModule(new BootstrapModule(['json']))
  },
  binary: true, // Enable return as binary!
})
```

Note that most of the time AWS's Lambda doesn't support return the Response with Binary content. To make it so please make sure you enabled `binary` mode as per example above.

## Enabled Debug Mode

Sometime we need to understand what's going on under the hood of our custom made feature such as RequestContext. Attach the message logging by declare

ENV: `KOBP_DEBUG` to `Yes` or `True` or `1` to let the framework emit debugging messages.

## TODO

```
[/] Example repo
[/] Modularized
[/] Core module
[/] Mikroorm module
[/] Publish with microbundle instead.
[/] Lambda Handler
[ ] SNS/SQS Handler
```
