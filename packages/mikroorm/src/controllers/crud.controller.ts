import type { AutoPath } from '@mikro-orm/core/typings'
import type { SqlEntityManager as EntityManager } from '@mikro-orm/knex'
import {
  ClientErrorCode,
  KobpError,
  ServerErrorCode,
  BaseRoutedController,
  withDocument,
  KobpServiceContext,
  RouteMap,
  SchemableObject,
  extractSchema,
  HttpMethod,
} from 'kobp'

import { Collection, QueryOperator, QueryOrderMap, Utils, wrap } from '@mikro-orm/core'

import values from 'lodash/values'
import map from 'lodash/map'
import pick from 'lodash/pick'
import fromPairs from 'lodash/fromPairs'
import toPairs from 'lodash/toPairs'
import isFunction from 'lodash/isFunction'

import { Middleware } from 'koa'
import { DI } from '../di'

export class CrudError extends Error {
  private constructor(type: string, resource: string, detail: string) {
    super(`${type}: ${resource}: ${detail}`)
  }

  static coded(type: string, resource: string, detail: string) {
    return new CrudError(type, resource, detail)
  }
}

export const helpers = {
  /**
   * Advance method for assigning complex object.
   * @param em
   * @param obj
   * @param payload
   * @returns
   */
  persistNestedCollection<E>(em: EntityManager, cnstr: new () => E, obj: E, payload: any): E {
    const parentEntity: any = obj
    for (const key in parentEntity) {
      if (!Object.prototype.hasOwnProperty.call(parentEntity, key)) {
        continue
      }
      // Process collection items so that assign can work through managed/unmanaged complications
      const meta = em.getMetadata().find(cnstr.name)
      if (!meta) {
        throw KobpError.fromUserInput(ClientErrorCode.notFound, `unable to resolve entity meta for ${cnstr.name}`)
      }
      const relationshipForThisKey = meta.relations.find((o) => o.name === key)
      const primaryKeysForCollectionElement = relationshipForThisKey?.targetMeta?.primaryKeys
      if (
        payload[key] instanceof Array &&
        parentEntity[key]?.loadItems &&
        relationshipForThisKey &&
        primaryKeysForCollectionElement
      ) {
        const parentKey = relationshipForThisKey.mappedBy
        const elementMeta = em.getMetadata().find(relationshipForThisKey.type)
        if (!elementMeta) {
          throw KobpError.fromUserInput(
            ClientErrorCode.notFound,
            `unable to resolve entity meta for ${relationshipForThisKey.type}`,
          )
        }
        const fromDb = parentEntity[key] as Collection<any>
        const fromPayload = payload[key] as Array<any>
        // Go through each existing objects.
        const toRemove = fromPairs(map(fromDb, (o) => [Utils.getCompositeKeyHash(o, elementMeta), o]))
        // let log = key === 'details' ? console.log.bind(console) : () => {}
        // log('FromDb', fromDb.getItems())
        // log('FromPayload', fromPayload)
        // log('toRemove', toRemove)
        // log('Element', primaryKeysForCollectionElement)
        for (let i = 0; i < fromPayload.length; i++) {
          // Creation case
          // Make the query from the relationship
          const query = pick(
            {
              ...pick(fromPayload[i], ...primaryKeysForCollectionElement),
              [parentKey]: parentEntity,
            },
            relationshipForThisKey.referencedPKs,
          )
          // Retry by fallback to default's session em.
          const found = em.getUnitOfWork().tryGetById(relationshipForThisKey.type, query)
          // log('Query', relationshipForThisKey, query)
          // log('Found', found)
          if (found) {
            // mark dirty
            wrap(found).assign(fromPayload[i], { em })
            delete toRemove[Utils.getCompositeKeyHash(found, elementMeta)]
          } else {
            // Add new ones
            const unmanaged = em.create(relationshipForThisKey.type, fromPayload[i])
            fromDb.add(unmanaged)
          }
        }
        // Removals
        for (const removal of values(toRemove)) {
          fromDb.remove(removal)
        }
        // remove this from payload to assign to object.
        delete payload[key]
      }
    }

    em.assign(obj as any, payload)
    return obj
  },
  /**
   * Supported format
   *
   * - Date Operator: `$dt(milliseconds)`
   * - Between Operator: `$between(v1, v2)`
   * - In Operator: `$in(value split by comma)`
   * - Like Operator: `$like(value)` -- does not support $datetime
   * - iLike Operator: `$ilike(value)` -- does not support $datetime
   * - greater then Operator: `$gt(value)`
   * - less than Operator: `$lt(value)`
   * - is null: `$null`
   * - is not null: `$notNull`
   *
   * @param v
   */
  evalQuery(v: string, resourceName: string): Partial<{ [key: string]: any }> | 'void' {
    const evalValue = (val: string): string => {
      if (/\$dt\([1-9][0-9]+\)/.test(val)) {
        const m = val.match(/\$dt\((.+)\)/)
        if (!m) throw CrudError.coded('RES-004 QUERY_MALFORM', resourceName, 'failed to evalQuery $dt')
        return new Date(+m[1]).toISOString()
      }
      return val
    }
    if (/^\$between\((\d+),(\d+)\)$/i.test(v)) {
      const m = v.match(/\$between\(([^,]+),(.+)\)/i)
      if (!m) throw CrudError.coded('RES-004 QUERY_MALFORM', resourceName, 'failed to evalQuery $between')
      // return [{ [QueryOperator.$lte]: +m[1] }, { [QueryOperator.$gte]: +m[2] }]
      return { $gte: +m[1], $lte: +m[2] }
    } else if (/^\$like\((.*)\)$/i.test(v)) {
      const m = v.match(/^\$like\((.*)\)$/i)
      if (!m) throw CrudError.coded('RES-004 QUERY_MALFORM', resourceName, 'failed to evalQuery $like')
      return { $like: m[1] }
    } else if (/^\$ilike\((.*)\)$/i.test(v)) {
      const m = v.match(/^\$ilike\((.*)\)$/i)
      if (!m) throw CrudError.coded('RES-004 QUERY_MALFORM', resourceName, 'failed to evalQuery $ilike')
      return { $ilike: m[1] }
    } else if (/^\$between\(([^,]+),(.+)\)$/i.test(v)) {
      const m = v.match(/^\$between\(([^,]+),(.+)\)$/i)
      if (!m) throw CrudError.coded('RES-004 QUERY_MALFORM', resourceName, 'failed to evalQuery $between')
      // return [`BETWEEN :${paramKeyFrom} AND :${paramKeyTo}`, {
      //   [paramKeyFrom]: evalValue(m[1]),
      //   [paramKeyTo]: evalValue(m[2])
      // }]
      return { $gte: evalValue(m[1]), $lte: evalValue(m[2]) }
    } else if (/^\$in\(.+\)$/i.test(v)) {
      const m = v.match(/^\$in\((.+)\)$/i)
      if (!m) throw CrudError.coded('RES-004 QUERY_MALFORM', resourceName, 'failed to evalQuery $in')
      const splitted = m[1].split(',').filter((o) => !!o)
      if (splitted.length > 0) {
        // return [`IN (:...${_pk})`, {
        //   [_pk]: splitted
        // }]
        return { $in: splitted.map(evalValue) }
      }
      return 'void'
    } else if (/^\$gt\(.+\)$/i.test(v)) {
      const m = v.match(/^\$gt\((.+)\)$/i)
      if (!m) throw CrudError.coded('RES-004 QUERY_MALFORM', resourceName, 'failed to evalQuery $gt')
      // return [`>= :${gtPk}`, {
      //   [gtPk]: evalValue(m[1])
      // }]
      return { $gt: evalValue(m[1]) }
    } else if (/^\$lt\(.+\)$/i.test(v)) {
      const m = v.match(/^\$lt\((.+)\)$/i)
      if (!m) throw CrudError.coded('RES-004 QUERY_MALFORM', resourceName, 'failed to evalQuery $lt')
      // return [`<= :${ltPk}`, {
      //   [ltPk]: evalValue(m[1])
      // }]
      return { $lt: evalValue(m[1]) }
    } else if (/\$null/i.test(v)) {
      return { $eq: null }
    } else if (/\$notNull/i.test(v)) {
      return { $ne: null }
    }
    return { $eq: evalValue(v) }
  },
}

export interface CrudControllerOption<E> {
  /**
   * Calculate an ObjectLiteral to produce where condition for every request.
   *
   * Where object should matched the criteria that is needed.
   *
   * This will acting as scope limitation.
   */
  forAllResources: (ctx: KobpServiceContext) => Partial<{ [key in keyof E]: any }>

  /**
   * Searchable fields
   */
  searchableFields: (keyof E)[]

  /**
   * list of fields that can be distincted by _lov endpoint.
   *
   * Adding field to this option will allow the controller to invoke (distinct list of value)
   * It is highly recommend that the fields to be present in this endpoint should be indexed for optimal performance.
   */
  distinctableFields: (keyof E)[]

  /**
   * Default populate options
   * - one = use when populate select one
   * - many = use when populate select many
   */
  defaultPopulate: (ctx: KobpServiceContext, isMany: boolean) => AutoPath<E, string>[]

  /**
   * Injecting filters before any query to be made;
   *
   * @see https://mikro-orm.io/docs/filters
   */
  defaultFilters: (ctx: KobpServiceContext, em: EntityManager) => Promise<any>

  /**
   * Process input
   */
  sanitizeInputBody: (ctx: KobpServiceContext, em: EntityManager, body: any, isCreating: boolean) => Promise<any>

  /**
   * Searchable field should be converted
   */
  searchableFieldValueConverter: Partial<{ [key in keyof E]: (raw: any) => string }>

  /**
   * Sorting options
   */
  orderBy: QueryOrderMap<E>

  /**
   * Load a resource for create method.
   *
   * This method will replace basic default constructor upon resource creation.
   */
  loadResourceToCreate: (ctx: KobpServiceContext, em: EntityManager) => Promise<E | undefined>

  /**
   * if not provided. Meaning there if only one resource in provided scope.
   *
   * Create method will become update method.
   * Delete method will become disabled.
   *
   * Possible value:
   *  - `:paramName<entityFieldName>`
   *  - `:paramNameAndColumnName`
   */
  resourceKeyPath: string

  /**
   * Hook that will apply to all objects loaded.
   */
  afterLoad: ((ctx: KobpServiceContext, objects: E[]) => Promise<E[]>)[]

  /**
   * Hook that call to compare loadedFromDb against inputPayload (sanitizedBody).
   */
  computeUpdatePayload: (ctx: KobpServiceContext, em: EntityManager, loadedFromDb: E, inputPayload: any) => Promise<any>

  /**
   * Hook that should never throw Error.
   */
  preSave: ((ctx: KobpServiceContext, em: EntityManager, object: E, isCreating: boolean) => Promise<E>)[]

  /**
   * Hook to tune
   */
  postSave: ((ctx: KobpServiceContext, em: EntityManager, object: E, isCreating: boolean) => Promise<E>)[]

  /**
   * Hook before destructive operation
   */
  preDelete: ((ctx: KobpServiceContext, em: EntityManager, objects: E[]) => Promise<E[]>)[]

  /**
   * Hook after destructive operation
   */
  postDelete: ((ctx: KobpServiceContext, em: EntityManager, deletedObjects: E[]) => Promise<void>)[]

  /**
   * Use _ as empty value
   *
   * Replace /^_$/ with '' value in keypath
   *
   * Use this option to avoid empty value in key path.
   */
  replaceUnderscrollWithEmptyKeyPath: boolean

  /**
   * All route middlewares
   */
  middlewares: Middleware[] | ((path: string, method: HttpMethod) => Middleware[])

  /**
   * Use document middleware
   */
  useDocumentMiddleware?: {
    /**
     * used in returning payload
     *
     * @default to this.cnstr (constructor) which relies on ApiDoc decorator to decorate all properties
     */
    resourceScheme?: SchemableObject

    /**
     * used in updating request
     *
     * @default to rootScheme
     */
    updateScheme?: SchemableObject

    /**
     * used in creation request
     *
     * @default to rootScheme
     */
    createScheme?: SchemableObject
  }
}

export class CrudController<E> extends BaseRoutedController {
  protected options: CrudControllerOption<E>

  protected resolvedResourcePath: string

  constructor(
    private cnstr: new () => E,
    public readonly resourceName: string,
    options: Partial<CrudControllerOption<E>>,
  ) {
    super()
    this.resolvedResourcePath = (options.resourceKeyPath || ':id').replace(/^\/?/, '/') // attach leading '/' if not provided.
    this.options = {
      middlewares: [],
      forAllResources: () => ({}),
      loadResourceToCreate: async () => undefined,
      defaultFilters: async () => ({}),
      sanitizeInputBody: async (_ctx, _em, body) => body,
      searchableFields: [],
      distinctableFields: [],
      searchableFieldValueConverter: {},
      orderBy: { updatedAt: -1 } as any, // Expected that every entity would have `updatedAt`
      computeUpdatePayload: async (_ctx, _em, _fromDb, body) => body,
      afterLoad: [],
      preSave: [],
      postSave: [],
      preDelete: [],
      postDelete: [],
      replaceUnderscrollWithEmptyKeyPath: false,
      defaultPopulate: () => [],
      useDocumentMiddleware: undefined,
      ...options,
      resourceKeyPath: this.resolvedResourcePath.replace(/<\w+>/g, ''), // removed <columnName> component
    }
    this.setAllRouteMiddlewares(this.options.middlewares)
  }

  protected getEntityManager(context: KobpServiceContext): EntityManager {
    if (context.em && context.em.createQueryBuilder) {
      return context.em
    }
    return DI.em as EntityManager
  }

  public getRouteMaps(): RouteMap {
    const doc = this.options.useDocumentMiddleware
      ? (documentMiddleware: Middleware[]): Middleware[] => documentMiddleware
      : (_documentMiddleware: Middleware[]): Middleware[] => []
    const resourcePaths = this.paramsToColumnNamePairs.map(({ paramName }) => `\`${paramName}\``).join(', ')
    // Scheme to be used in the operation documents
    const _sch: Record<'read' | 'update' | 'create', SchemableObject> = {
      read: this.options.useDocumentMiddleware?.resourceScheme || (this.cnstr as any),
      update:
        this.options.useDocumentMiddleware?.updateScheme ||
        this.options.useDocumentMiddleware?.resourceScheme ||
        (this.cnstr as any),
      create:
        this.options.useDocumentMiddleware?.createScheme ||
        this.options.useDocumentMiddleware?.resourceScheme ||
        (this.cnstr as any),
    }
    const routeMap: RouteMap = {
      ...super.getRouteMaps(),
      index: {
        method: 'get',
        path: '/',
        middlewares: doc([
          withDocument((b) =>
            b
              .summary('List all resources')
              .describe(`List all ${this.resourceName}s`)
              .onOk({
                schema: {
                  type: 'object',
                  properties: {
                    count: {
                      type: 'integer',
                      description: 'number of all items matched the criteria',
                    },
                    items: {
                      type: 'array',
                      items: {
                        ...extractSchema(_sch.read, true, 'read')[1],
                      },
                      description: 'items fetched in this request',
                    },
                  },
                },
              }),
          ),
        ]),
      },
      createOne: {
        method: 'post',
        path: '/',
        middlewares: doc([
          withDocument((b) =>
            b
              .summary('Create a single resource')
              .describe(`Create a resource of type ${this.resourceName}`)
              .useBody({
                required: true,
                content: {
                  'application/json': {
                    schema: extractSchema(_sch.create, true, 'write')[1],
                  },
                },
              })
              .onOk(_sch.read),
          ),
        ]),
      },
      distinct: {
        method: 'get',
        path: '/_lov/:fieldName',
        middlewares: doc([
          withDocument((b) =>
            b
              .summary(`List distinct values`)
              .describe(`List distinct value of \`fieldName\` for ${this.resourceName}`)
              .onErrorBadRequest(`Invalid \`fieldName\` for '${this.resourceName}'`)
              .usePath('fieldName', {
                schema: {
                  type: 'string',
                  enum: this.options.distinctableFields,
                  description: 'list of distinctable fields for this resource',
                },
              })
              .onOk({
                schema: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              }),
          ),
        ]),
      },
      getOne: {
        method: 'get',
        path: this.options.resourceKeyPath,
        middlewares: doc([
          withDocument((b) =>
            b
              .summary(`Retrieve a single resource of type ${this.resourceName}`)
              .describe(`Retreive single ${this.resourceName} by ${resourcePaths}`)
              .onOk(_sch.read),
          ),
        ]),
      },
      updateOne: {
        method: 'post',
        path: this.options.resourceKeyPath,
        middlewares: doc([
          withDocument((b) =>
            b
              .describe(`Update single resource of type ${this.resourceName} by primary identifier`)
              .summary(`Update single ${this.resourceName} by ${resourcePaths}`)
              .useBody({
                required: true,
                content: {
                  'application/json': {
                    schema: extractSchema(_sch.update, true, 'write')[1],
                  },
                },
              })
              .onOk(_sch.read),
          ),
        ]),
      },
      deleteOne: {
        method: 'delete',
        path: this.options.resourceKeyPath,
        middlewares: doc([
          withDocument((b) =>
            b
              .summary(`Delete single resource of type ${this.resourceName} by primary identifier`)
              .describe(`Delete single ${this.resourceName} by ${resourcePaths}`)
              .onOk({
                schema: {
                  type: 'number',
                },
              }),
          ),
        ]),
      },
    }
    if (this.options.distinctableFields.length <= 0) {
      delete routeMap['distinct']
    }
    return routeMap
  }

  /**
   * Create a single record.
   * @param context
   */
  public async createOne(context: KobpServiceContext): Promise<E> {
    const body = context.request.body
    if (!body) {
      throw CrudError.coded('RES-006 UPDATE_MALFORM', this.resourceName, 'Empty update body, nothing to update!')
    }
    if (typeof body === 'string') {
      throw CrudError.coded('RES-006 UPDATE_MALFORM', this.resourceName, 'expected JSON body.')
    }

    const allReq = this.options.forAllResources(context)
    let raw = new this.cnstr()

    return await this.getEntityManager(context).transactional(async (t): Promise<E> => {
      const sanitizedBody = await this.options.sanitizeInputBody(context, t, body, true)
      const preloadInstance = await this.options.loadResourceToCreate(context, t)
      raw =
        preloadInstance ||
        t.create(this.cnstr, {
          ...sanitizedBody,
          ...allReq,
        })

      const validator = (this.cnstr as any).validate
      if (validator) {
        await validator(raw)
      }

      // Apply preSave hook
      for (const h of this.options.preSave) {
        raw = await h(context, t, raw, true)
      }

      // Save
      t.persist(raw as any)

      // Apply postSave hook
      for (const h of this.options.postSave) {
        raw = await h(context, t, raw, true)
      }

      await t.flush()
      return raw
    })
  }

  public async getOne(
    context: KobpServiceContext,
    manager?: EntityManager,
    _supressFilters: boolean = false,
  ): Promise<E> {
    const query = context.request.query
    const hasPopulate = Boolean(query.populate)
    const populatedByQuery = (
      typeof query.populate === 'string' ? query.populate.split(',') : query.populate || []
    ).filter(Boolean)

    const em = manager || this.getEntityManager(context)
    const _filterQueries = await this._filtersQuery(context, em)
    const where = {
      ...this._forKeyPath(context),
      ...this.options.forAllResources(context),
      $and: [..._filterQueries],
    }

    let r: E | undefined = undefined
    r = (await em.findOne(this.cnstr, where, {
      // filters,
      populate: hasPopulate ? <any>populatedByQuery : this.options.defaultPopulate(context, false),
    })) as E

    if (!r) {
      const elementMeta = em.getMetadata().find(this.cnstr.name)
      if (!elementMeta) {
        throw KobpError.fromUserInput(
          ClientErrorCode.notFound,
          `Unknown resource ${this.resourceName}: unable to resolve entity meta`,
        )
      }
      const primaryKeyHash = Utils.getCompositeKeyHash(where, elementMeta)
      throw KobpError.fromUserInput(
        ClientErrorCode.notFound,
        `Unknown resource ${this.resourceName}: ${primaryKeyHash}`,
      )
    }

    let rarray = [r]
    for (const h of this.options.afterLoad) {
      rarray = await h(context, rarray)
    }

    if (rarray.length !== 1) {
      throw KobpError.fromServer(
        ServerErrorCode.internalServerError,
        `Internal resource hooks (${this.resourceName}) might not returned promised objects. Please check afterLoad hooks.`,
      )
    }

    return r
  }

  /**
   * Update a single record.
   * @param context
   */
  public async updateOne(context: KobpServiceContext): Promise<E> {
    const body = context.request.body
    if (!body) {
      throw KobpError.fromUserInput(
        ClientErrorCode.notFound,
        `Invalid input for ${this.resourceName} - empty update body.`,
      )
    }

    return await this.getEntityManager(context).transactional(async (t): Promise<E> => {
      let raw: E = await this.getOne(context, t)

      let sanitizedBody = await this.options.sanitizeInputBody(context, t, body, false)
      sanitizedBody = await this.options.computeUpdatePayload(context, t, raw, sanitizedBody)
      raw = helpers.persistNestedCollection(t, this.cnstr, raw, sanitizedBody)

      // Apply preSave hook
      for (const h of this.options.preSave) {
        raw = await h(context, t, raw, false)
      }

      // Save
      t.persist(raw as any)

      // Apply postSave hook
      for (const h of this.options.postSave) {
        raw = await h(context, t, raw, false)
      }

      await t.flush()

      // Apply afterLoad hooks
      for (const h of this.options.afterLoad) {
        ;[raw] = await h(context, [raw])
      }

      return raw
    })
  }

  /**
   * Delete requested resource by get the existing one first?
   * @param context
   */
  public async deleteOne(context: KobpServiceContext): Promise<number> {
    return await this.getEntityManager(context).transactional(async (t): Promise<number> => {
      const r = await this.getOne(context, t)

      let deleteEntries: E[] = [r]
      for (const h of this.options.preDelete) {
        deleteEntries = await h(context, t, deleteEntries)
      }

      // Actually delete it
      let count = 0
      for (const e of deleteEntries) {
        context.logger?.log('DELETING', e)
        count += 1
        await t.removeAndFlush(e)
      }

      for (const h of this.options.postDelete) {
        await h(context, t, deleteEntries)
      }

      return count
    })
  }

  /**
   * !due to unfriendly merge option of filtering object. Nested merge is not really working. We
   * !utilise existing filter definition, and use it to merge on our own here.
   *
   * @param context
   * @param em
   */
  private async _filtersQuery(context: KobpServiceContext, em: EntityManager): Promise<any[]> {
    // due to unsupported merge option. We only utilise MikroORM's filters as definition.
    const requestFilter = await this.options.defaultFilters(context, em)
    const meta = em.getMetadata().find(this.cnstr.name)
    if (!meta) {
      throw KobpError.fromUserInput(
        ClientErrorCode.notFound,
        `Unknown resource ${this.resourceName}: unable to resolve entity meta`,
      )
    }
    const results: any[] = []
    for (const f of Object.keys(requestFilter)) {
      if (!meta.filters[f]) {
        throw KobpError.fromServer(ServerErrorCode.internalServerError, `Invalid filter key: ${f}!`)
      }
      const metaFilter = meta.filters[f]
      if (requestFilter[f]) {
        const cond = isFunction(metaFilter.cond) ? metaFilter.cond(requestFilter[f], 'read', em) : metaFilter.cond

        if (cond) {
          results.push({ $and: [cond] })
        }
      }
    }
    return results
  }

  /**
   *
   */
  public async index(context: KobpServiceContext): Promise<{ count: number; items: E[] }> {
    const query = context.request.query
    const offset = +(query['offset'] || 0)
    const pageSize = +(query['pagesize'] || 20)
    const hasPopulate = Boolean(query.populate)
    const populatedByQuery = (
      typeof query.populate === 'string' ? query.populate.split(',') : query.populate || []
    ).filter(Boolean)

    const em = this.getEntityManager(context)

    const _filterQueries = await this._filtersQuery(context, em)

    const smartWhereClause = {
      ...this.options.forAllResources(context),
      $and: [..._filterQueries, ...this._whereClauseByQuery(context)],
    }

    let [items, count] = await em.findAndCount(
      this.cnstr,
      { $and: [smartWhereClause] },
      {
        limit: pageSize,
        offset: offset,
        orderBy: this._orderBy(context),
        filters: await this.options.defaultFilters(context, em),
        populate: hasPopulate ? <any>populatedByQuery : this.options.defaultPopulate(context, true),
      },
    )

    // Apply afterLoad hooks
    for (const h of this.options.afterLoad) {
      items = await h(context, items)
    }

    return {
      count,
      items,
    }
  }

  public async distinct(context: KobpServiceContext): Promise<string[]> {
    const fieldName = context.params.fieldName
    if (this.options.distinctableFields.indexOf(fieldName) < 0) {
      throw CrudError.coded(
        'RES-004 QUERY_MALFORM',
        this.resourceName,
        'cannot perform distinct query over non-whitelisted fields.',
      )
    }
    const em = this.getEntityManager(context)
    const _filterQueries = await this._filtersQuery(context, em)
    const smartWhereClause = {
      ...this.options.forAllResources(context),
      $and: [..._filterQueries, ...this._whereClauseByQuery(context)],
    }

    const qb = em.createQueryBuilder(this.cnstr)
    const res = await qb.select(fieldName, true).where(smartWhereClause).execute('all')
    return res.map((v) => v[fieldName])
  }

  /* PRIVATE METHODS */

  /**
   * Extract orderBy from incoming `context.request.query`.
   * @param context
   */
  private _orderBy(context: KobpServiceContext): QueryOrderMap<E> {
    const req = context.request
    if (req.query.order) {
      const order = req.query.order as string
      const orders = order.split(',')
      return orders.reduce((c, element): QueryOrderMap<E> => {
        const m = element.match(/^([^ ]+)(\s+(asc|desc))?$/)
        if (!m)
          throw CrudError.coded(
            'RES-004 QUERY_MALFORM',
            this.resourceName,
            'order MUST has following format `db_field_name_1 asc,db_field_name2,db_field_name_3 desc`',
          )
        return { ...c, [m[1]]: (m[2]?.toLowerCase() ?? 'desc') as any }
      }, {})
    }
    return this.options.orderBy
  }

  private _whereClauseByQuery(
    context: KobpServiceContext,
  ): Partial<{ [key in keyof E]: Partial<{ [key in QueryOperator]: any }> }>[] {
    const req = context.request
    // const scopes = get(this.cnstr, 'scope', get(this.cnstr, 'scopes', {}))
    // const scopeName = get(req.query, 'scope', '') as string

    // Validate scope object
    // if (!!scopeName && !(scopeName in scopes)) {
    //   throw ServiceError.coded('RES-003 INVALID_RESOURCE_SCOPE', { resource: this.resourceName, scopeName, scopes })
    // }
    // q = { key: value }
    const q: { [key: string]: string | string[] | Function } = <any>{
      // ...pick(scopes, scopeName, {} as any),
      ...pick(req.query, this.options.searchableFields),
    }

    /**
     * {
     *  [fieldName]: {
     *    [key in QueryOperator]: any,
     *    ...
     *  }
     * }
     */
    const res = toPairs(q).map(([key, v]): Partial<{ [key in keyof E]: Partial<{ [key in QueryOperator]: any }> }> => {
      if (typeof v === 'function')
        throw CrudError.coded('RES-004 QUERY_MALFORM', this.resourceName, 'Cannot evaluate value as function.')
      const _v = this.options.searchableFieldValueConverter[key]
        ? this.options.searchableFieldValueConverter[key](v)
        : v
      const val = helpers.evalQuery(_v, this.resourceName)
      return val === 'void' ? {} : ({ [key]: val } as any)
    })
    return res
  }

  /**
   * Return keyPair mapping of URL parameters.
   *
   * Format:
   *
   * ```
   *  :paramName(regex)<columnName>
   *
   * or
   *  :paramName(regex)              => columnName = paramName
   *
   * or
   *  :paramName<columnName>         => regEx = ([A-Za-z0-9_]{0,})       // ** based on Express document.
   * ```
   */
  protected get paramsToColumnNamePairs(): { columnName: string; paramName: string; pattern: string }[] {
    const matchedPaths = this.resolvedResourcePath.match(/:(\w+)(\([^)]*\))?(<\w+>)?/g)
    return [...matchedPaths].reduce(
      (c, str) => {
        const r = str.match(/:(\w+)(\([^)]*\))?(<(\w+)>)?/)
        if (!r)
          throw CrudError.coded(
            'RES-005 BAD_CONTROLLER_CONFIGURATION',
            this.resourceName,
            "failed to parse/convert columnNamePairs. Check your controller's request path pattern.",
          )
        c.push({
          paramName: r[1],
          columnName: r[4] || r[1],
          pattern: r[2] || '([A-Za-z0-9_]{0,})',
        })
        return c
      },
      [] as { columnName: string; paramName: string; pattern: string }[],
    )
  }

  private _forKeyPath(context: KobpServiceContext): Partial<{ [key in keyof E]: any }> {
    const valueGetter = !this.options.replaceUnderscrollWithEmptyKeyPath
      ? (paramName: string) => context.params[paramName]
      : (paramName: string) => (context.params[paramName] || '').replace(/^_$/, '')

    return this.paramsToColumnNamePairs.reduce((c, p) => {
      c[p.columnName] = valueGetter(p.paramName)
      return c
    }, {})
  }
}
