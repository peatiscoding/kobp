import { Entity, Property } from "@mikro-orm/core"

@Entity({
  tableName: 'tags'
})
export class TagEntity {

  @Property({
    columnType: 'VARCHAR(250)',
    nullable: false,
    primary: true,
  })
  slug: string = ''

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onUpdate: () => new Date(),
  })
  updatedAt = new Date()
}