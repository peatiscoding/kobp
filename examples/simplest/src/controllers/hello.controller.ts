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
        security: [{ bearerAuth: [] }],
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
    withDocument
      .builder()
      .summary('echo back the body')
      .onOk(z.object({ message: z.string() }))
      .middleware(),
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
        query: s.object({
          name: s.string().min(2).default('world').describe('the name to say hello'),
        }),
        headers: s.object({
          'x-title': s.string().max(5).default('Mr.').describe('the title of the the name to say hello to'),
        }),
      }),
      withLabel('doodle'),
      // Add document via builder!
      withDocument
        .builder()
        .summary('Say hello to the world')
        .onOk(
          s.object({
            hello: s.string().describe('the name to say hello'),
          }),
        )
        .middleware(),
    ],
  })
  async index(ctx: KobpServiceContext) {
    Loggy.log('Say hello to the world')
    const fullName = `${ctx.header['x-title'] || ''} ${ctx.query.name || 'world'}`
    return {
      hello: fullName,
    }
  }

  @Route({
    method: 'post',
    path: '/load/:repeatText',
    middlewares: [
      withValidation({
        params: z.object({
          // the possible shape of params is strings. only
          repeatText: z.string().max(30).describe('the text to repeat {query.size} times'),
        }),
        query: z.object({
          // the possible shape of params is strings. only
          size: z.string().default('100000').describe('the size of the array'),
        }),
        body: z.object({
          data: z.number().default(3).describe('the value to multiply {query.size} times'),
        }),
      }),
      withDocument
        .builder()
        .summary('Try calling heavy loads!')
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
                type: 'number',
              },
            },
          },
        })
        .onErrorBadRequest('Input too long!')
        .middleware(),
    ],
  })
  async load(ctx: KobpServiceContext) {
    // Just access no need to validate
    const inputRepeatText = ctx.params.repeatText
    const inputSize = +(ctx.query.size || 100_000)
    const inputData = +(ctx.request.body.data || 3)
    const repeatText = repeat(`${inputRepeatText}`, inputSize)
    const arr = repeat('SomeArray', inputSize)
    const data = inputData ** inputSize
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
