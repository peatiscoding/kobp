import { Client } from "../utils/client"

describe('LangController Endpoint', () => {
  const client = new Client({
    host: 'http://localhost:3456'
  })

  it('can resolve lang from DI without colliding with another request', async () => {
    const input = ['th', 'g', 'f', 'd']
    const results = await Promise.all([
      client.readLangFromHeader(1, input[0]),
      client.readLangFromHeader(0.1, input[1]),
      client.readLangFromHeader(0.2, input[2]),
      client.readLangFromHeader(0.3, input[3]),
    ])

    for(let i=0;i<input.length;i++) {
      expect(results[i].httpStatusCode).toEqual(200)
      expect(results[i].data).toBeTruthy()
      expect(results[i].data.context.before).toEqual(input[i])
      expect(results[i].data.context.after).toEqual(input[i])
      expect(results[i].data.di.before).toEqual(input[i])
      expect(results[i].data.di.after).toEqual(input[i])
    }
  })
})