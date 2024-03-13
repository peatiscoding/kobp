import { Entity, Property } from '@mikro-orm/core'
import { ApiDoc } from 'kobp-mikroorm'
import { s } from 'ajv-ts'

@Entity({
  tableName: 'book_tag',
})
export class BookTagEntity {
  @Property({
    columnType: 'VARCHAR(250)',
    nullable: false,
    primary: true,
  })
  @ApiDoc({ schema: s.string().describe('Name of the tag') })
  slug: string = ''

  @Property({
    columnType: 'timestamp',
    nullable: false,
    onUpdate: () => new Date(),
  })
  @ApiDoc({ schema: s.string().format('date-time').describe('Last update time of the tag') })
  updatedAt?: Date = new Date()
}
