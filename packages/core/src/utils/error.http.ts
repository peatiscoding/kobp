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

  /**
   * This axiosError can detect if an Axios Error emitted from `withJson`.
   * @param anyError 
   * @returns 
   */
  static from(anyError: KobpError | any): KobpError {
    if (anyError instanceof KobpError) {
      return anyError
    }
    if (anyError.response) {
      const errorStatus = anyError.response?.status
      const errorResponseData = anyError.response?.data
      const errorResponseMessage = anyError.response?.data?.message || anyError.message
      return new KobpError(errorStatus, errorResponseMessage, errorResponseData || {})
    }
    return KobpError.fromServer(ServerErrorCode.internalServerError, anyError && anyError.message, {})
  }
}
