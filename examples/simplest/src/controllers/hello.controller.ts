import { KobpServiceContext, Lang, Loggy, withDocument, withValidation } from 'kobp'
import { Route, BaseRoutedController } from 'kobp'
import { repeat } from 'lodash'
import { withLabel } from 'src/middlewares/label'
import { z } from 'zod'
import { s } from 'ajv-ts'

export class HelloController extends BaseRoutedController {
  constructor() {
    super([
      withDocument({
        tags: ['hello'],
      }),
    ])
  }

  @Route(
    'post',
    '/echo',
    withValidation({
      body: z
        .object({
          message: z.string().min(2).max(5),
        })
        .required(),
    }),
    withDocument.builder().summary('echo back the body').middleware(),
  )
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
      withValidation({
        query: s
          .object({
            name: s.string().min(2).default('world').describe('the name to say hello'),
          })
          .required(),
      }),
      withLabel('doodle'),
      // Add document via builder!
      withDocument
        .builder()
        .summary('Say hello to the world')
        .responses((r) =>
          r.onOk({
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
        .middleware(),
    ],
  })
  async index(ctx: KobpServiceContext) {
    Loggy.log('Say hello to the world')
    return {
      hello: ctx.query.name || 'world',
    }
  }

  @Route({
    method: 'post',
    path: '/load/:repeatText',
    middlewares: [
      withValidation({
        params: z.object({
          repeatText: z.string().max(30).describe('the text to repeat 100k times'),
        }),
      }),
      withDocument
        .builder()
        .summary('Try calling heavy loads!')
        .responses((r) =>
          r
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
        .middleware(),
    ],
  })
  async load(ctx: KobpServiceContext) {
    const inputRepeatText = ctx.params.repeatText
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
