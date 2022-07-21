import type Koa from 'koa'
import type { 
  Context,
  APIGatewayProxyCallback,
  APIGatewayEvent,
} from 'aws-lambda'

type OrgAWSHandler = (event: APIGatewayEvent, context: Context, callback: APIGatewayProxyCallback) => void
type Handler = (event: APIGatewayEvent, context: Context) => Promise<void>

/**
 * Parameters those would effect how system behave upon creation.
 */
interface MakeHandlerOptions {
  allowedBodyTypes: string[]
  // Dispatched whenever the application is initialized
  onHandlerCreated?: () => void
  middlewareBeforeFork?: (app: Koa) => void
  middlewareAfterFork?: (app: Koa) => void
}

export const makeLambdaHandler = (handler: Handler): OrgAWSHandler => (event, context, callback) => {

}