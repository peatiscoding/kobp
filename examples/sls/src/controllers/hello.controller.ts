import type { Context } from 'koa'
import { BaseRoutedController, Route } from 'kobp'

export class HelloController extends BaseRoutedController {

  @Route()
  async index(_context: Context) {
    return {
      hello: 'world!'
    }
  }

  @Route({
    method: 'post',
    path: '/echo',
    middlewares: [
    ]
  })
  async echo(_context: Context) {
    return {
      body: _context.request.body,
    }
  }
}