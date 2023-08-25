import type { Context } from 'koa'
import { BaseRoutedController, Loggy, Route } from 'kobp'
import { parseBodyForBuffer as parseBody } from '../logics/busboy'
import { S3MediaClient, withEnvironment } from '../logics/s3'

export class HelloController extends BaseRoutedController {

  private s3: S3MediaClient

  constructor() {
    super()
    this.s3 = new S3MediaClient(withEnvironment(), 'EXPENSE_DOCS')
  }

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

  @Route({
    method: 'post',
    path: '/upload',
    middlewares: [
    ]
  })
  async upload(_context: Context) {
    // handle upload here.
    try {
      const { file, filename } = await parseBody(_context.req)
      // Save the file/ filename onto S3
      await this.s3.putObject('pr/null/attachments', filename.filename, file)
      return filename
    } catch (e) {
      Loggy.error('failed to upload the content.', e)
      throw e
    }
  }
}
