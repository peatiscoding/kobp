import { SqlEntityManager } from "@mikro-orm/mysql-base"
import { DI } from "kobp"
import { values } from "lodash"
import { helpers } from "../../../../src"
import { ShelfEntity, TagEntity } from "../../entities"
import { prepareDependencies } from "../utils/di"

const bookFixtures = {
  ABC: {
    isbn: '0593438531',
    title: 'Every Summer After',
  },
  DEF: {
    isbn: '1538724731',
    title: 'Verity',
  },
  GHI: {
    isbn: '0805047905',
    title: 'Brown Bear, Brown Bear, What Do You See?',
    tags: [{
      slug: 'children-book'
    }]
  },
}

const shelfFixtures = {
  EXAMPLE: 'EXAMPLE',
  EXAMPLE2: 'EXAMPLE2',
  EXAMPLE3: 'EXAMPLE3',
}

describe('ShelfEntity', () => {
  beforeAll(async () => {
    await prepareDependencies()
    // destroy existing data
    await DI.em.fork().nativeDelete(ShelfEntity, {
      slug: values(shelfFixtures),
    })
  })

  afterAll(async () => {
    await DI.orm.close()
  })

  describe.each`
  slug                            | bookSlugs                       | updateTo
  ${shelfFixtures.EXAMPLE}        | ${'ABC'}                        | ${''}
  ${shelfFixtures.EXAMPLE2}       | ${'ABC,DEF,GHI'}                | ${'DEF,GHI'}
  ${shelfFixtures.EXAMPLE3}       | ${''}                           | ${'DEF,GHI,ABC'}
  `('$slug shelf for $bookSlugs', ({ slug, bookSlugs, updateTo }) => {

    const books = bookSlugs
      .split(',')
      .filter(Boolean)
      .map((k) => bookFixtures[k])
    const isbns = books.map((b) => b.isbn).sort()

    const updatedBooks = updateTo
      .split(',')
      .filter(Boolean)
      .map((k) => bookFixtures[k])
    const updatedIsbns = updatedBooks.map((b) => b.isbn).sort()

    it('can be saved onto DB', async () => {
      const em = DI.em.fork()

      // Side effect to make sure Many-to-Many entities is already prepared for
      // creation checks. Hence when tags will be properly loaded the entities are
      // already exists in the EM.
      // Load tags onto memory first
      await em.find(TagEntity, {})

      const shelf = em.create(ShelfEntity, { slug, books })
      em.persist(shelf)
      await em.flush()
      
      expect(shelf).toBeTruthy()
    })

    it('can be queried from DB', async () => {
      const em = DI.em.fork()
      const shelf = await em.findOne(ShelfEntity, { slug })

      expect(shelf).toBeTruthy()
      expect(shelf.books).toBeTruthy()
      await shelf.books.loadItems()
      expect(shelf.books.count()).toEqual(books.length)
      expect(shelf.books.getItems().map((book) => book.isbn).sort()).toEqual(isbns)
    })

    it('can be updated to DB', async () => {
      const em = <SqlEntityManager>DI.em.fork()
      await em.find(TagEntity, {})

      // Fetch by id
      let shelf = await em.findOne(ShelfEntity, { slug }, {
        populate: ['books', 'books.tags']
      })

      const changes = <any>{ books: updatedBooks }
      shelf = <any>helpers.persistNestedCollection(em, ShelfEntity, shelf, changes)

      await em.flush()

      expect(shelf).toBeTruthy()
      expect(shelf.books).toBeTruthy()
    })

    it('can be queried (again) from DB', async () => {
      const em = DI.em.fork()
      const shelf = await em.findOne(ShelfEntity, { slug })

      expect(shelf).toBeTruthy()
      expect(shelf.books).toBeTruthy()
      await shelf.books.loadItems()
      expect(shelf.books.count()).toEqual(updatedBooks.length)
      expect(shelf.books.getItems().map((book) => book.isbn).sort()).toEqual(updatedIsbns)
    })
  })
})