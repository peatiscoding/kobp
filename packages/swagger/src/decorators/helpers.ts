export function createMixedDecorator<T = any>(metakey: string, metadata: T): MethodDecorator & ClassDecorator {
  return (target: object, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>): any => {
    if (descriptor) {
      console.log('>>>>>>>>>>>>>>>>>> DESC', descriptor)
      let metadatas: any
      if (Array.isArray(metadata)) {
        const previousMetadata = Reflect.getMetadata(metakey, descriptor.value) || []
        metadatas = [...previousMetadata, ...metadata]
      } else {
        const previousMetadata = Reflect.getMetadata(metakey, descriptor.value) || {}
        metadatas = { ...previousMetadata, ...metadata }
      }
      Reflect.defineMetadata(metakey, metadatas, descriptor.value)
      return descriptor
    }
    console.log('>>>>>>>>>>>>>>>>>> TARGET', target)
    Reflect.defineMetadata(metakey, metadata, target)
    return target
  }
}
