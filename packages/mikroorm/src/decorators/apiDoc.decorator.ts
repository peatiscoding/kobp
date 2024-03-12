import { EntityMetadata, EntityProperty } from '@mikro-orm/core'
import { SchemableObject, extractSchema } from 'kobp'

export interface SchemaDocInfo {
  /**
   * Use this attribute to explicitly define the type of the property
   */
  schema?: SchemableObject
  isArray?: boolean
  description?: string
}

const _helpers = {
  META_PROP_KEY: (propertyName: string) => `apidoc:${propertyName}`,
  META_PROP_SCHEMA_CACHE: `apidoc:schema:cached`,

  resolveMikroSchelaTypeToJsonSchema: (propMeta: EntityProperty<any>): SchemableObject => {
    // TODO: Add more support types here
    return {
      schema: {
        type: 'string',
      },
    }
  },
  loadJsonSchema: (metadata: EntityMetadata, target: Function) => {
    const metaKeys = Reflect.getMetadataKeys(target)
    const properties = {}
    for (const metaKey of metaKeys) {
      const [propertyName, docInfo] = Reflect.getMetadata(metaKey, target) as [string, SchemaDocInfo]
      if (!docInfo.schema) {
        // try finding information from MetadataStorage
        const mikroPropMeta = metadata.properties[propertyName]
        // console.log('Try extracting metadata from "', propertyName, '"', mikroPropMeta)
        if (mikroPropMeta.kind === 'm:n') {
          docInfo.schema = mikroPropMeta.targetMeta?.class as any // these classes already augmented.
        } else if (mikroPropMeta.kind === 'scalar') {
          docInfo.schema = _helpers.resolveMikroSchelaTypeToJsonSchema(mikroPropMeta)
        }
      }
      // if all attempts above still failed then give up.
      if (!docInfo.schema) {
        continue
      }
      const schemable = docInfo.schema as SchemableObject
      const s = extractSchema(schemable)[1]
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
 * @usage ```typescript
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
        gend = _helpers.loadJsonSchema(metadata, target)
        Reflect.defineMetadata(_helpers.META_PROP_SCHEMA_CACHE, gend, target)
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
