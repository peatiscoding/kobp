import type { KobpServiceContext, Middleware } from '../context'
import { ClientErrorCode, KobpError } from '../utils'

/**
 * The general interface that fits `zod`, `ajv-ts`, etc.
 */
export interface KobpParsable<T> {
  /**
   * A pure synchronus function that handles parsing
   * and ensure the given input object matches the required T Type
   * otherwise throws Error
   *
   * This function will ensure that;
   *
   * [1] context.query matches the T.query spec.
   * [2] context.body matches the T.body spec.
   * [3] context.params matches the T.params spec.
   *
   * @throws {Error} the message of the error will then be wrapped with KobpError
   */
  parse(object: any): T
}

export const withValidation = <
  T extends { query?: Q; params?: P; body?: B },
  Q extends Record<string, any>,
  P extends Record<string, string | number>,
  B = any,
>(
  schemaSpec: KobpParsable<T>,
): Middleware => {
  // TODO: build up a parser for this route
  return async (context: KobpServiceContext, next) => {
    const query = context.query
    const params = context.params
    const body = context.request.body
    try {
      schemaSpec.parse({ query, params, body })
    } catch (err) {
      throw KobpError.fromUserInput(ClientErrorCode.badRequest, (err as Error).message)
    }
    await next()
  }
}
