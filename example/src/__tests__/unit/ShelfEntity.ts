import { DI } from "kobp"
import { values } from "lodash"
import { ShelfEntity } from "../../entities"
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
  },
}

const shelfFixtures = {
  EXAMPLE: 'EXAMPLE',
  EXAMPLE2: 'EXAMPLE2',
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
  slug                            | bookSlugs
  ${shelfFixtures.EXAMPLE}        | ${'ABC'}
  ${shelfFixtures.EXAMPLE2}       | ${'ABC,DEF'}
  `('$slug shelf for $bookSlugs', ({ slug, bookSlugs }) => {

    const books = bookSlugs
      .split(',')
      .filter(Boolean)
      .map((k) => bookFixtures[k])
    const isbns = books.map((b) => b.isbn)

    it('can be saved onto DB', async () => {
      const em = DI.em.fork()
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
      expect(shelf.books.getItems().map((book) => book.isbn)).toEqual(isbns)
    })
  })
})