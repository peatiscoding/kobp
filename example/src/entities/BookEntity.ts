import type { BookTagEntity } from '.'
import {
  Collection,
  Entity,
  ManyToMany,
  Property,
} from "@mikro-orm/core"

@Entity({
  tableName: 'books'
})
export class BookEntity {

  @Property({
    columnType: 'VARCHAR(120)',
    nullable: false,
    primary: true,
  })
  isbn: string

  @Property({
    columnType: 'VARCHAR(250)',
    nullable: false,
    primary: false,
  })
  title: string

  @ManyToMany({
    entity: 'BookTagEntity',
    owner: true,
    eager: true,
  })
  tags: Collection<BookTagEntity> = new Collection<BookTagEntity>(this)

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onUpdate: () => new Date(),
  })
  updatedAt = new Date()
}