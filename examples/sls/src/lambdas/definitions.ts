import {
  handlerPath,
  ServerlessFnDef,
} from 'kobp-lambda/serverless'

const def = new ServerlessFnDef(`${handlerPath(__dirname)}/handlers`)
  .fn('hello')
  .functions()

export default def