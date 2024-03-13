import { EntityMetadata, EntityProperty } from '@mikro-orm/core'
import { SchemableObject, extractSchema } from 'kobp'

export interface SchemaDocInfo {
  /**
   * Use this attribute to explicitly define the type of the property
   */
  schema?: SchemableObject
  /**
   * useful when leave the schema empty
   */
  isArray?: boolean
  /**
   * provide the immediate field's description
   */
  description?: string
  /**
   * marking field as Readonly
   */
  readonly?: boolean
}

const _helpers = {
  META_PROP_KEY: (propertyName: string) => `apidoc:prop:${propertyName}`,
  META_PROP_SCHEMA_CACHE: `apidoc:schema:cached`,
  META_PROP_READONLY_SCHEMA_CACHE: `apidoc:readonly_schema:cached`,

  resolveMikroSchelaTypeToJsonSchema: (propMeta: EntityProperty<any>): SchemableObject => {
    // TODO: Add more support types here
    return {
      schema: {
        type: 'string',
      },
    }
  },
  /**
   * try to resolve schema from metadata
   */
  retryResolveSchemable: (
    metadata: EntityMetadata,
    docInfo: SchemaDocInfo,
    propertyName: string,
  ): SchemaDocInfo | undefined => {
    if (!docInfo.schema) {
      // try finding information from MetadataStorage
      const mikroPropMeta = metadata.properties[propertyName]
      // console.log('Try extracting metadata from "', propertyName, '"', mikroPropMeta)
      if (mikroPropMeta.kind === 'm:n' || mikroPropMeta.kind === '1:m') {
        docInfo.schema = mikroPropMeta.targetMeta?.class as any // these classes already augmented.
        docInfo.isArray = true
      } else if (mikroPropMeta.kind === 'scalar') {
        docInfo.schema = _helpers.resolveMikroSchelaTypeToJsonSchema(mikroPropMeta)
      }
    }
    return docInfo
  },
  loadJsonSchema: (metadata: EntityMetadata, target: Function, mode: 'read' | 'write') => {
    const filteredMetaKeys = Reflect.getMetadataKeys(target).filter((k) => k.startsWith(_helpers.META_PROP_KEY('')))
    // Buffer
    const properties = {}
    for (const metaKey of filteredMetaKeys) {
      // Try get metadata from Reflection first.
      let [propertyName, docInfo] = Reflect.getMetadata(metaKey, target) as [string, SchemaDocInfo]
      // if provided attribute is readonly attribute, but we are resolving in Write mode. Skip it.
      if (docInfo.readonly && mode === 'write') {
        continue
      }
      // attempt to resolve schemable object from metadata if Reflect.getMetadata failed. (from MikroORM)
      docInfo = _helpers.retryResolveSchemable(metadata, docInfo, propertyName)
      // if all attempts above still failed then give up.
      if (!docInfo.schema) {
        continue
      }
      const schemable = docInfo.schema as SchemableObject
      const s = extractSchema(schemable, false, mode)[1]
      if (docInfo.isArray) {
        properties[propertyName] = {
          type: 'array',
          items: s,
          description: docInfo.description || s.description,
        }
      } else {
        properties[propertyName] = { ...s, description: docInfo.description || s.description }
      }
    }
    return {
      type: 'object',
      properties,
    }
  },
}

/**
 * Using augmentApiDoc for update all Entities so that they are `kobp/SchemableObject`
 *
 * @usage ```ts
 * const ormConfig = defineConfig({
 *   // the configs
 *   discovery: {
 *     onMetadata: augmentApiDoc,
 *   },
 * })
 * ```
 */
export const augmentApiDoc = (metadata: EntityMetadata) => {
  const target = metadata.class
  Object.defineProperty(target, 'schema', {
    get: () => {
      let gend = Reflect.getMetadata(_helpers.META_PROP_SCHEMA_CACHE, target)
      if (!gend) {
        gend = _helpers.loadJsonSchema(metadata, target, 'write')
        Reflect.defineMetadata(_helpers.META_PROP_SCHEMA_CACHE, gend, target)
      }
      return gend
    },
  })
  Object.defineProperty(target, 'readonlySchema', {
    get: () => {
      let gend = Reflect.getMetadata(_helpers.META_PROP_READONLY_SCHEMA_CACHE, target)
      if (!gend) {
        gend = _helpers.loadJsonSchema(metadata, target, 'read')
        Reflect.defineMetadata(_helpers.META_PROP_READONLY_SCHEMA_CACHE, gend, target)
      }
      return gend
    },
  })
}

/**
 * Annotate property with API Doc info and it schema
 */
export const ApiDoc = (docInfo: SchemaDocInfo): PropertyDecorator => {
  return (target: any, propertyName: string) => {
    Reflect.defineMetadata(_helpers.META_PROP_KEY(propertyName), [propertyName, docInfo], target.constructor)
  }
}
