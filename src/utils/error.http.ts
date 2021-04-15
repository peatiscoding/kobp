import { ErrorCode, ClientErrorCode, ServerErrorCode } from './response'

export class KobpError extends Error {

  constructor(public readonly statusCode: ErrorCode, message: string, public readonly data?: any) {
    super(message)
  }

  /**
   * Error due to Client side input
   * 
   * @param code
   * @param message
   * @param data
   */
  static fromUserInput(code: ClientErrorCode, message: string, data?: any): KobpError {
    return new KobpError(code, message, data)
  }

  /**
   * Error due to Service side logic
   * 
   * @param code
   * @param message
   * @param data
   */
  static fromServer(code: ServerErrorCode, message: string, data?: any): KobpError {
    return new KobpError(code, message, data)
  }
}
