import { Entity, Property } from "@mikro-orm/core"

@Entity({
  tableName: 'book_tag'
})
export class BookTagEntity {

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
  updatedAt?: Date = new Date()
}