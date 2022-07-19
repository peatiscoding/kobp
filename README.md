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
    return context.request
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

Now to utilise this controller. Simply use Koa as your application with our boiler plate.

`server.ts`

```ts
export default makeServer((koa) => {
}, {
  port: 9000
})
```

By the example above. You will be able to:

```bash
curl -XGET http://localhost:9000/hello/hi
```

## TODO

```
[ ] Example repo
[ ] Inter Service Communication
[ ] SNS/SQS Handler
```