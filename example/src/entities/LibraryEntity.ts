import type { LibraryShelfEntity } from "."
import { Cascade, Collection, Entity, OneToMany, Property } from "@mikro-orm/core"

@Entity({
  tableName: 'library'
})
export class LibraryEntity {

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

  @OneToMany({
    entity: 'LibraryShelfEntity',
    cascade: [Cascade.PERSIST],
    orphanRemoval: true,
    mappedBy: (shelf: LibraryShelfEntity) => shelf.library,
  })
  shelves = new Collection<LibraryShelfEntity>(this)

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onUpdate: () => new Date(),
  })
  updatedAt = new Date()
}