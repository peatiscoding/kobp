// For helping in exporting tools
export const handlerPath = (context: string) => {
  return `${context.split(process.cwd())[1].substring(1).replace(/\\/g, '/')}`
}

export class ServerlessFnDef {
  private fns: any = {}

  public constructor(public readonly baseHandlerPath: string) {
  }

  // Register a function.
  public fn(prefix: string, handlerModulePath?: string): ServerlessFnDef {
    const actualHandlerModulePath = [this.baseHandlerPath, handlerModulePath ?? `${prefix}.default`].join('/')
    this.fns[prefix] = {
      name: ['${self:custom.stage}', prefix].join('-'),
      handler: actualHandlerModulePath,
      events: [
        {
          http: {
            method: 'any',
            path: `${prefix}/{proxy+}`,
          }
        },
        {
          http: {
            method: 'any',
            path: `${prefix}/`,
          }
        }
      ]
    }
    return this
  }
  
  public functions(): any {
    return this.fns
  }
}