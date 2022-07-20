import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { LibraryShelfEntity } from '../../entities'

export interface APIResponse {
  httpStatusCode: number
  error?: any
}

export interface APIObjectResponse extends APIResponse {
  data: {
    [key: string]: any
  }
}

export interface APIArrayResponse extends APIResponse {
  data: any[]
}

export interface APIArrayWithCountResponse extends APIResponse {
  data: any[]
  count: number
}

export interface APIStringWithCountResponse extends APIResponse {
  data: string
}

export class Client {
 
  axios: AxiosInstance

  constructor(private readonly conf: { host: string }) {
    this.axios = axios.create({
      baseURL: `${this.conf.host}/`,
      validateStatus: () => true,
    })
  }

  public async readLangFromHeader(waitForSeconds: number, injection: string): Promise<APIObjectResponse> {
    const resp = await this.axios.get(`/lang/delay/${waitForSeconds}`, {
      headers: {
        'x-lang': injection,
        'x-trace-id': 'ABC',
      }
    })
    return { httpStatusCode: resp.status, data: resp.data.data }
  }

  public async listLibraries(limit: number = 0, offset: number = 0): Promise<APIArrayResponse> {
    const resp = await this.axios.get('/library', {
      params: {
        limit,
        offset,
      }
    })
    return { httpStatusCode: resp.status, data: resp.data.data.items }
  }

  public async getLibrary(librarySlug: string): Promise<APIObjectResponse> {
    const resp = await this.axios.get(`/library/${librarySlug}`)
    return { httpStatusCode: resp.status, data: resp.data.data }
  }

  public async createNewLibrary(librarySlug: string, shelves: LibraryShelfEntity[]): Promise<APIObjectResponse> {
    const resp = await this.axios.post('/library', {
      slug: librarySlug,
      shelves,
    })
    return { httpStatusCode: resp.status, data: resp.data.data, error: resp.data.error }
  }

  public async updateLibrary(librarySlug: string, shelves: LibraryShelfEntity[]): Promise<APIObjectResponse> {
    const resp = await this.axios.post(`/library/${librarySlug}`, {
      shelves,
    })
    return { httpStatusCode: resp.status, data: resp.data.data }
  }
}