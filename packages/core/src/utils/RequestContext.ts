import { AsyncLocalStorage } from 'async_hooks'
import { KobpServiceContext } from '../context'
import { env } from './env'

type RequestContextCreator<O extends any> = new (context: any) => O

const isDebug = env.b('KOBP_DEBUG', false)

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
    RequestRoomProvider.shared.roomRegistries[keyName] = constructor
  }
}

export class KobpRequestRoom {

  private static counter = 1

  public readonly id = KobpRequestRoom.counter++

  constructor(protected readonly data: Map<string, any>) {
    if (isDebug) {
      console.log(`RCTX KobpRequestRoom #${this.id} created with data of size: ${data.size}`)
    }
  }

  get<T>(key: string): T {
    return this.data[key]
  }

  set<T>(key: string, data: T) {
    this.data[key] = data
  }

  public free() {
    if (isDebug) {
      console.log(`RCTX KobpRequestRoom #${this.id} of size ${this.data.size} has been freed.`)
    }
    this.data.clear()
  }
}

/**
 * A factory for `KobpRequestRoom`
 */
export class RequestRoomProvider {

  private storage = new AsyncLocalStorage<KobpRequestRoom>()

  public roomRegistries: Record<string, new (context: any) => any> = {}

  public static readonly shared = new RequestRoomProvider()

  private constructor() {
    if (isDebug) {
      console.log(`RCTX RoomProvider. This should be called only once. If you see this message multiple times. Then something is wrong..`)
    }
    console.info('RCTX RoomProvider has been created.')
  }

  // Entry point for Middleware (Koa) to call.
  public createAsync(_ctx: KobpServiceContext, next: (...args: any[]) => Promise<KobpRequestRoom>): Promise<KobpRequestRoom> {
    const rctx = this.createContext(_ctx)
    if (isDebug) {
      console.log(`RCTX RoomProvider.createAsync. Middleware registered. If you see this message multiple times. Then something is wrong..`)
    }
    return this.storage.run(rctx, (...args) => {
      if (isDebug) {
        console.log(`RCTX RoomProvider RoomContext injected.`)
      }
      return next(...args)
    }).finally(rctx.free.bind(rctx))
  }

  public current(): KobpRequestRoom | undefined  {
    return this.storage.getStore()
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

  public createContext(_ctx: KobpServiceContext): KobpRequestRoom {
    const _room = new KobpRequestRoom(new Map())
    if (isDebug) {
      console.log(`RCTX RoomProvider.createContext. KobpRequestRoom #${_room.id} Context is being initialized.`)
    }
    for(const regKey in this.roomRegistries) {
      const cnstr = this.roomRegistries[regKey]
      _room.set(regKey, new cnstr(_ctx))
      if (isDebug) {
        console.log(`RCTX RoomProvider.createContext. KobpRequestRoom #${_room.id} Context populating: ${regKey}, new instance of ${cnstr}`)
      }
    }
    return _room
  }
}
