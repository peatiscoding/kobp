import { ApiDoc } from 'kobp-mikroorm'
import type { LibraryEntity, BookEntity } from '.'
import { Cascade, Collection, Entity, ManyToMany, ManyToOne, PrimaryKeyProp, Property } from '@mikro-orm/core'
import { s } from 'ajv-ts'

@Entity({
  tableName: 'library_shelf',
})
export class LibraryShelfEntity {
  [PrimaryKeyProp]: [string, string]

  @ManyToOne({
    entity: 'LibraryEntity',
    primary: true,
    cascade: [Cascade.REMOVE],
  })
  library: LibraryEntity

  @Property({
    columnType: 'VARCHAR(250)',
    nullable: false,
    primary: true,
  })
  @ApiDoc({})
  slug: string = ''

  @Property({
    columnType: 'VARCHAR(250)',
    nullable: false,
  })
  @ApiDoc({})
  title: string = ''

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onUpdate: () => new Date(),
  })
  @ApiDoc({ schema: s.string().format('date-time').describe('Last update time of the shelf'), readonly: true })
  updatedAt = new Date()

  @ManyToMany({
    entity: 'BookEntity',
    owner: true,
    eager: true,
  })
  @ApiDoc({ description: 'Books on this shelf' })
  books: Collection<BookEntity> = new Collection<BookEntity>(this)
}

