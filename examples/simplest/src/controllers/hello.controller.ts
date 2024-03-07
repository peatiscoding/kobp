import { KobpServiceContext, Lang, Loggy, withDocument } from 'kobp'
import { Route, BaseRoutedController } from 'kobp'
import { repeat } from 'lodash'
import { withLabel } from 'src/middlewares/label'

export class HelloController extends BaseRoutedController {
  constructor() {
    super([
      withDocument({
        tags: ['hello'],
      }),
    ])
  }
  @Route('post', '/echo')
  async migrate(context: KobpServiceContext) {
    return context.request.body
  }

  @Route({
    method: 'get',
    path: '/lang',
  })
  async lang(_ctx: KobpServiceContext) {
    return `${Lang.current()}`
  }

  @Route({
    method: 'get',
    path: '/',
    middlewares: [
      withLabel('doodle'),
      withDocument({
        description: 'Say hello to the world!',
        responses: {
          200: {
            description: 'Say hello to the world!',
          },
        },
      }),
    ],
  })
  async index(_ctx: KobpServiceContext) {
    Loggy.log('Say hello to the world')
    return {
      hello: 'world',
    }
  }

  @Route({
    method: 'post',
    path: '/load',
    middlewares: [],
  })
  async load(_ctx: KobpServiceContext) {
    const arr = repeat('SomeArray', 100_000)
    const data = repeat('Data', 100_000)
    const numbers = repeat(`${300}`, 100_000)
    return {
      arr,
      data,
      numbers,
    }
  }

  @Route({
    method: 'post',
    path: '/upload',
    middlewares: [],
  })
  async upload(_ctx: KobpServiceContext) {}
}
