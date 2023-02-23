import { AsyncLocalStorage } from 'async_hooks'
import { KobpServiceContext } from '../context'
import { env } from './env'

type RequestContextCreator<O extends any> = new (context: any) => O

const isDebug = env.b('KOBP_DEBUG', false)


const _storage = new AsyncLocalStorage<KobpRequestRoom>()
const _roomRegistries: Record<string, new (context: any) => any> = {}

if (isDebug) {
  console.log('RCTX initialized, >>>>>>>>>>>>>>>>>>> this should appear only ONCE. >>>>>>>>>>>>>>>>>>>')
}

/**
 * Marking any class to be available when resource is being created.
 * 
 * - Automatically register to `RequestContextCreator`
 * 
 * Once registered the class will automaticall enabled by the `keyName` provided.
 * which can be accessed through:
 * 
 * `RequestRoomProvider.shared.currentInstance(keyName or classConstructor)`
 */
export function RequestContextEnabled(keyName: string) {
  return function (constructor: RequestContextCreator<any>) {
    constructor.prototype.__rctx_enabled = keyName
    if (isDebug) {
      console.log(`RCTX RequestContextEnabled (decorator) registered: ${keyName} with`, constructor)
    }
    _roomRegistries[keyName] = constructor
  }
}

export class KobpRequestRoom {

  private static counter = 1

  public readonly id = KobpRequestRoom.counter++

  private data: Map<string, any> = new Map()

  public constructor(context: KobpServiceContext) {
    for(const regKey in _roomRegistries) {
      const cnstr = _roomRegistries[regKey]
      this.set(regKey, new cnstr(context))
    }
    if (isDebug) {
      console.log(`RCTX KobpRequestRoom #${this.id} created with data of size: ${this.data.size}`)
    }
  }

  get<T>(key: string): T {
    const v = this.data[key]
    if (isDebug) {
      console.log(`RCTX KobpRequestRoom #${this.id} get(${key}) ${v}.`)
    }
    return v
  }

  set<T>(key: string, data: T) {
    if (isDebug) {
      console.log(`RCTX KobpRequestRoom #${this.id} has been set with ${key}.`)
    }
    this.data[key] = data
  }

  public free() {
    if (isDebug) {
      console.log(`RCTX KobpRequestRoom #${this.id} of size ${[...this.data.keys()].join(', ')} has been freed.`)
    }
    this.data.clear()
  }
}

/**
 * A factory for `KobpRequestRoom`
 */
export class RequestRoomProvider {

  private static _instance?: RequestRoomProvider

  public static get shared(): RequestRoomProvider {
    return this._instance ?? (this._instance = new RequestRoomProvider())
  }

  private constructor() {
    if (isDebug) {
      console.log(`RCTX RoomProvider. This should be called only once. If you see this message multiple times. Then something is wrong..`)
    }
  }

  // Entry point for Middleware (Koa) to call.
  public createAsync(_ctx: KobpServiceContext, next: (...args: any[]) => Promise<KobpRequestRoom>): Promise<KobpRequestRoom> {
    const rctx = new KobpRequestRoom(_ctx)
    if (isDebug) {
      console.log(`RCTX RoomProvider.createAsync. RoomContext created.`)
    }
    return _storage.run(rctx, next).finally(rctx.free.bind(rctx))
  }

  public current(): KobpRequestRoom | undefined  {
    if (isDebug) {
      console.log(`RCTX RoomProvider.current().`)
    }
    return _storage.getStore()
  }

  public static instanceOf<O>(keyOrCnstr: string | RequestContextCreator<O>): O | undefined {
    return RequestRoomProvider.shared.currentInstance(keyOrCnstr)
  }

  public currentInstance<O>(key: string | RequestContextCreator<O>): O | undefined {
    if (typeof key === 'string') {
      return this.current()?.get(key)
    }
    const cnstrEnabledKey = key.prototype.__rctx_enabled
    if (!cnstrEnabledKey) {
      throw new Error('Class does not decorated as RequestContextEnabled')
    }
    return this.current()?.get(cnstrEnabledKey)
  }
}
