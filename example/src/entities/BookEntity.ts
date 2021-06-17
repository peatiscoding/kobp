import type { ShelfEntity } from "."
import { Entity, ManyToOne, PrimaryKeyType, Property } from "@mikro-orm/core"

@Entity({
  tableName: 'books'
})
export class BookEntity {

  [PrimaryKeyType]: [string, string]

  @ManyToOne({
    entity: 'ShelfEntity',
    primary: true,
    onDelete: 'cascade',
  })
  shelf: ShelfEntity

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

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onUpdate: () => new Date(),
  })
  updatedAt = new Date()
}