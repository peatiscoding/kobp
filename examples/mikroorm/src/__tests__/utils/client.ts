import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { omit } from 'lodash'
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

  public async listBookTags(limit: number = 0, offset: number = 0): Promise<APIArrayResponse> {
    const resp = await this.axios.get('/book/tag/', {
      params: {
        limit,
        offset,
      }
    })
    return { httpStatusCode: resp.status, data: resp.data.data.items }
  }

  public async createNewBookTag(slug: string): Promise<APIObjectResponse> {
    const resp = await this.axios.post('/book/tag/', {
      slug,
    })
    return { httpStatusCode: resp.status, data: resp.data.data, error: resp.data.error }
  }

  public async listBooks(limit: number = 0, offset: number = 0): Promise<APIArrayResponse> {
    const resp = await this.axios.get('/book', {
      params: {
        limit,
        offset,
      }
    })
    return { httpStatusCode: resp.status, data: resp.data.data.items }
  }

  public async createNewBook(isbn: string, title: string, tags: { slug: string }[]): Promise<APIObjectResponse> {
    const resp = await this.axios.post('/book', {
      isbn,
      title,
      tags,
    })
    return { httpStatusCode: resp.status, data: resp.data.data, error: resp.data.error }
  }

  public async updateBook(isbn: string, title: string, tags: { slug: string }[]): Promise<APIObjectResponse> {
    const resp = await this.axios.post(`/book/${isbn}`, {
      isbn,
      title,
      tags,
    })
    return { httpStatusCode: resp.status, data: resp.data.data, error: resp.data.error }
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

  public async createNewLibrary(librarySlug: string, title: string, shelves: LibraryShelfEntity[]): Promise<APIObjectResponse> {
    const resp = await this.axios.post('/library', {
      slug: librarySlug,
      title: title || librarySlug,
      shelves,
    })
    return { httpStatusCode: resp.status, data: resp.data.data, error: resp.data.error }
  }

  /**
   * Try update specific library without tampering the nested attribute "shelves"
   * @param librarySlug
   * @param title 
   * @returns 
   */
  public async updateLibraryTitle(librarySlug: string, title: string): Promise<APIObjectResponse> {
    const resp = await this.axios.post(`/library/${librarySlug}`, {
      title,
    })
    return { httpStatusCode: resp.status, data: resp.data.data }
  }

  public async updateLibraryShelves(librarySlug: string, shelves: LibraryShelfEntity[]): Promise<APIObjectResponse> {
    const resp = await this.axios.post(`/library/${librarySlug}`, {
      shelves,
    })
    return { httpStatusCode: resp.status, data: resp.data.data }
  }

  public async updateLibraryShelvesWithoutBooks(librarySlug: string, rawShelves: LibraryShelfEntity[]): Promise<APIObjectResponse> {
    const payload = JSON.stringify(rawShelves)
    const shelves = JSON.parse(payload).map((shelf) => omit(shelf, 'books'))
    const resp = await this.axios.post(`/library/${librarySlug}`, {
      shelves,
    })
    return { httpStatusCode: resp.status, data: resp.data.data }
  }

  public async updateLibraryTitleAndShelves(librarySlug: string, title: string, shelves: LibraryShelfEntity[]): Promise<APIObjectResponse> {
    const resp = await this.axios.post(`/library/${librarySlug}`, {
      title,
      shelves,
    })
    return { httpStatusCode: resp.status, data: resp.data.data }
  }
}