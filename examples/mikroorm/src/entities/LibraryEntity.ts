import { ApiDoc } from 'kobp-mikroorm'
import { LibraryShelfEntity } from '.'
import { Cascade, Collection, Entity, OneToMany, Property } from '@mikro-orm/core'
import { s } from 'ajv-ts'

@Entity({
  tableName: 'library',
})
export class LibraryEntity {
  @Property({
    columnType: 'VARCHAR(250)',
    nullable: false,
    primary: true,
  })
  @ApiDoc({ schema: s.string().describe('Primary Slug of the library') })
  slug: string = ''

  @Property({
    columnType: 'VARCHAR(250)',
    nullable: false,
  })
  @ApiDoc({ schema: s.string().describe('Title of the library') })
  title: string = ''

  @OneToMany({
    entity: 'LibraryShelfEntity',
    cascade: [Cascade.PERSIST],
    orphanRemoval: true,
    mappedBy: (shelf: LibraryShelfEntity) => shelf.library,
  })
  @ApiDoc({ description: 'Shelves within this library'})
  shelves = new Collection<LibraryShelfEntity>(this)

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onUpdate: () => new Date(),
  })
  @ApiDoc({ schema: s.string().format('date-time').describe('Last update time of the library'), readonly: true })
  updatedAt = new Date()
}

