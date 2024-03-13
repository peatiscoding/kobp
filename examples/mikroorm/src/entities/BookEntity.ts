import { BookTagEntity } from '.'
import { t } from '@mikro-orm/core'
import { Collection, Entity, ManyToMany, Property } from '@mikro-orm/core'
import { s } from 'ajv-ts'
import { ApiDoc } from 'kobp-mikroorm'

@Entity({
  tableName: 'books',
})
export class BookEntity {
  @Property({
    columnType: 'VARCHAR(120)',
    type: t.string,
    nullable: false,
    primary: true,
  })
  @ApiDoc({ schema: s.string().describe('ISBN of the book') })
  isbn: string

  @Property({
    columnType: 'VARCHAR(250)',
    type: t.string,
    nullable: false,
    primary: false,
  })
  @ApiDoc({ schema: s.string().describe('Title of the book') })
  title: string

  @ManyToMany({
    entity: 'BookTagEntity',
    type: t.datetime,
    owner: true,
    eager: true,
  })
  @ApiDoc({ description: 'Tags of the book' })
  tags: Collection<BookTagEntity> = new Collection<BookTagEntity>(this)

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onUpdate: () => new Date(),
  })
  updatedAt = new Date()
}
