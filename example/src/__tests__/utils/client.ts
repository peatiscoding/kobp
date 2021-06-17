import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { BookEntity } from '../../entities'

export interface APIResponse {
  httpStatusCode: number
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

  public async listShelves(limit: number = 0, offset: number = 0): Promise<APIArrayResponse> {
    const resp = await this.axios.get('/shelf', {
      params: {
        limit,
        offset,
      }
    })
    return { httpStatusCode: resp.status, data: resp.data.data.items }
  }

  public async getShelf(shelfSlug: string): Promise<APIObjectResponse> {
    const resp = await this.axios.get(`/shelf/${shelfSlug}`)
    return { httpStatusCode: resp.status, data: resp.data.data }
  }

  public async createNewShelf(shelfSlug: string, books: BookEntity[]): Promise<APIObjectResponse> {
    const resp = await this.axios.post('/shelf', {
      slug: shelfSlug,
      books,
    })
    return { httpStatusCode: resp.status, data: resp.data.data }
  }

  public async updateShelf(shelfSlug: string, books: BookEntity[]): Promise<APIObjectResponse> {
    const resp = await this.axios.post(`/shelf/${shelfSlug}`, {
      books,
    })
    return { httpStatusCode: resp.status, data: resp.data.data }
  }
}