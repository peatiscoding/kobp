import {
  ShelfEntity,
  TagEntity,
} from '.'
import { Collection, Entity, ManyToMany, ManyToOne, PrimaryKeyType, Property } from "@mikro-orm/core"

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

  @ManyToMany({
    entity: () => TagEntity,
    owner: true,
    eager: true,
  })
  tags: Collection<TagEntity> = new Collection<TagEntity>(this)

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onUpdate: () => new Date(),
  })
  updatedAt = new Date()
}