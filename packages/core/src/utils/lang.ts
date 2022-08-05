import { KobpServiceContext } from '../context'
import { RequestContextEnabled, RequestRoomProvider } from './RequestContext'

@RequestContextEnabled('__lang__')
export class Lang {

  public static requestHeaderLanguageKey = 'x-lang'
  public static defaultLangSymbol = 'en'

  private langFromHeader: string

  public constructor(ctx: KobpServiceContext) {
    this.langFromHeader = `${ctx.request.headers[Lang.requestHeaderLanguageKey] || ''}`
  }

  public static current(fallback: string = ''): string {
    const lng = RequestRoomProvider.instanceOf(this)
    return lng.langFromHeader || fallback || Lang.defaultLangSymbol
  }
}