import type {
  LibraryEntity,
  BookEntity,
} from "."
import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryKeyType,
  Property,
} from "@mikro-orm/core"

@Entity({
  tableName: 'library_shelf'
})
export class LibraryShelfEntity {

  [PrimaryKeyType]: [string, string]

  @ManyToOne({
    entity: 'LibraryEntity',
    primary: true,
    onDelete: 'cascade',
  })
  library: LibraryEntity

  @Property({
    columnType: 'VARCHAR(250)',
    nullable: false,
    primary: true,
  })
  slug: string = ""

  @Property({
    columnType: 'VARCHAR(250)',
    nullable: false,
  })
  title: string = ""

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onUpdate: () => new Date(),
  })
  updatedAt = new Date()

  @ManyToMany({
    entity: 'BookEntity',
    owner: true,
    eager: true,
  })
  books: Collection<BookEntity> = new Collection<BookEntity>(this)
}