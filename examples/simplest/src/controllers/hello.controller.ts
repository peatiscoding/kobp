import { ClientErrorCode, KobpError, KobpServiceContext, Lang, Loggy, withDocument, withDocumentBuilder } from 'kobp'
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
    path: '/hi',
    middlewares: [
      withLabel('doodle'),
      // Add document via builder!
      withDocumentBuilder()
        .summary('Say hello to the world')
        .useQuery('name', {
          example: 'kobp',
          schema: {
            type: 'string',
            default: 'world',
          },
          required: false,
        })
        .responses((b) =>
          b.onOk({
            // OpenAPI scheme document
            schema: {
              properties: {
                hello: {
                  type: 'string',
                  example: 'world',
                },
              },
            },
          }),
        )
        .build(),
    ],
  })
  async index(_ctx: KobpServiceContext) {
    Loggy.log('Say hello to the world')
    return {
      hello: _ctx.query.name || 'world',
    }
  }

  @Route({
    method: 'post',
    path: '/load/:repeatText',
    middlewares: [
      withDocumentBuilder()
        .summary('Try calling heavy loads!')
        .usePath('repeatText', {
          example: 'REPEAT_ME',
          schema: {
            type: 'string',
            description: 'the text to repeat for 100,000 times',
          },
          required: true,
        })
        .responses((b) =>
          b
            .onOk({
              // OpenAPI scheme document
              schema: {
                properties: {
                  repeatText: {
                    type: 'string',
                  },
                  arr: {
                    type: 'string',
                  },
                  data: {
                    type: 'string',
                  },
                },
              },
            })
            .onErrorBadRequest('Input too long!'),
        )
        .build(),
    ],
  })
  async load(ctx: KobpServiceContext) {
    const inputRepeatText = ctx.params.repeatText
    if (inputRepeatText.length > 30) {
      throw KobpError.fromUserInput(ClientErrorCode.badRequest, 'Input too long!')
    }
    const repeatText = repeat(`${inputRepeatText}`, 100_000)
    const arr = repeat('SomeArray', 100_000)
    const data = repeat('Data', 100_000)
    return {
      repeatText,
      arr,
      data,
    }
  }

  @Route({
    method: 'post',
    path: '/upload/:type',
    middlewares: [],
  })
  async upload(_ctx: KobpServiceContext) {}
}
