import { KobpServiceContext, Lang } from 'kobp'
import { Route, BaseRoutedController } from 'kobp'
import { repeat } from 'lodash'

export class HelloController extends BaseRoutedController {

  @Route('post', '/echo')
  async migrate(context: KobpServiceContext) {
    return context.request.body
  }

  @Route({
    method: 'get',
    path: '/lang',
  })
  async lang(context: KobpServiceContext) {
    return `${Lang.current()}`
  }

  @Route()
  async index(context: KobpServiceContext) {
    return {
      hello: 'world'
    }
  }

  @Route({
    method: 'post',
    path: '/load',
    middlewares: [],
  })
  async load(context: KobpServiceContext) {
    const arr = repeat('SomeArray', 100_000)
    const data = repeat('Data', 100_000)
    const numbers = repeat(`${300}`, 100_000)
    return {
      arr,
      data,
      numbers,
    }
  }
}