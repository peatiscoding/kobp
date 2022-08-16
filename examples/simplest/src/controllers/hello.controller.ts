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