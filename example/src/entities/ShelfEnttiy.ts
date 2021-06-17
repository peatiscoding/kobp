import type { BookEntity } from "."
import { Cascade, Collection, Entity, OneToMany, Property } from "@mikro-orm/core"

@Entity({
  tableName: 'shelves'
})
export class ShelfEntity {

  @Property({
    columnType: 'VARCHAR(250)',
    nullable: false,
    primary: true,
  })
  slug: string = ""

  @OneToMany({
    entity: 'BookEntity',
    cascade: [Cascade.PERSIST],
    orphanRemoval: true,
    mappedBy: (book: BookEntity) => book.shelf,
  })
  books = new Collection<BookEntity>(this)

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onUpdate: () => new Date(),
  })
  updatedAt = new Date()
}