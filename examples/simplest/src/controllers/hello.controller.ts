import { KobpServiceContext, Lang } from 'kobp'
import { Route, BaseRoutedController } from 'kobp'

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
}