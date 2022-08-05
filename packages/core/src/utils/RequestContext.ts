import { AsyncLocalStorage } from 'async_hooks'
import { KobpServiceContext } from '../context'

type RequestContextCreator<O extends any> = new (context: any) => O

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
    RequestRoomProvider.shared.roomRegistries[keyName] = constructor
  }
}

export class KobpRequestRoom {

  private static counter = 1

  public readonly id = KobpRequestRoom.counter++

  constructor(protected readonly data: Map<string, any>) { }

  get<T>(key: string): T {
    return this.data[key]
  }

  set<T>(key: string, data: T) {
    this.data[key] = data
  }

}

/**
 * A factory for `KobpRequestRoom`
 */
export class RequestRoomProvider {

  private storage = new AsyncLocalStorage<KobpRequestRoom>()

  public roomRegistries: Record<string, new (context: any) => any> = {}

  public static readonly shared = new RequestRoomProvider()

  public createAsync(_ctx: KobpServiceContext, next: (...args: any[]) => Promise<KobpRequestRoom>): Promise<KobpRequestRoom> {
    const rctx = this.createContext(_ctx)
    return this.storage.run(rctx, (...args) => {
      return next(...args)
    })
  }

  public current(): KobpRequestRoom | undefined  {
    const store = this.storage.getStore()
    return store
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
    for(const regKey in this.roomRegistries) {
      const cnstr = this.roomRegistries[regKey]
      _room.set(regKey, new cnstr(_ctx))
    }
    return _room
  }
}
