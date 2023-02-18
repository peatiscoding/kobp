import { SqlEntityManager } from "@mikro-orm/knex"
import { values } from "lodash"
import { DI, helpers } from "kobp-mikroorm"
import { BookEntity, LibraryEntity } from "../../entities"
import { prepareDependencies } from "../utils/di"

const shelfFixture: Record<string, Partial<any>> = {
  arch: {
    slug: 'architecture',
  },
  computer101: {
    slug: 'computer-101',
  },
  novel: {
    slug: 'novel',
    books: [
      {
        isbn: '0199535566',
        title: 'Pride and Prejudice (Oxford World\'s Classics)',
        tags: [
          { slug: 'classic' },
          { slug: 'soft-cover' },
        ]
      },
      {
        isbn: '1400079144',
        title: 'The Lost Symbol',
        tagS: [
          { slug: 'soft-cover' },
        ]
      }
    ]
  },
  babyAndToddlers: {
    slug: 'baby-and-toddlers',
    books: [
      {
        isbn: '0805047905',
        title: 'Brown Bear, Brown Bear, What Do You See?',
        tags: [
          { slug: 'children-book' },
        ]
      },
    ]
  }
}

const libraryFixtures = {
  EXAMPLE: 'LIB_A',
  EXAMPLE2: 'LIB_B',
  EXAMPLE3: 'LIB_C',
  EXAMPLE4: 'LIB_D',
}

describe('ShelfEntity', () => {
  beforeAll(async () => {
    await prepareDependencies()
    // destroy existing data
    await DI.em.fork().nativeDelete(LibraryEntity, {
      slug: values(libraryFixtures),
    })
  })

  afterAll(async () => {
    await DI.orm.close()
  })

  describe.each`
  slug                            | shelfSlugs                      | updateToSlugs
  ${libraryFixtures.EXAMPLE}      | ${'arch'}                       | ${''}
  ${libraryFixtures.EXAMPLE2}     | ${'arch,novel,babyAndToddlers'} | ${'novel,computer101'}
  ${libraryFixtures.EXAMPLE3}     | ${''}                           | ${'comptuer101,novel'}
  ${libraryFixtures.EXAMPLE4}     | ${'novel'}                      | ${'babyAndToddlers'}
  `('$slug library with $shelfSlugs shelves', ({ slug, shelfSlugs, updateToSlugs }) => {

    const createShelves: Array<Partial<LibraryEntity>> = shelfSlugs
      .split(',')
      .map((key: string) => shelfFixture[key])
      .filter(Boolean)

    const updatedShelves: Array<Partial<LibraryEntity>> = updateToSlugs
      .split(',')
      .map((key: string) => shelfFixture[key])
      .filter(Boolean)

    it('can be saved onto DB', async () => {
      const em = DI.em.fork()

      // Side effect to make sure Many-to-Many entities is already prepared for
      // creation checks. Hence when tags will be properly loaded the entities are
      // already exists in the EM.
      // Load tags onto memory first
      await em.find(BookEntity, {})

      const shelf = em.create(LibraryEntity, { slug, shelves: createShelves })
      em.persist(shelf)
      await em.flush()
      
      expect(shelf).toBeTruthy()
    })

    it('can be queried from DB', async () => {
      const em = DI.em.fork()
      const libr = await em.findOne(LibraryEntity, { slug })

      expect(libr).toBeTruthy()
      expect(libr.shelves).toBeTruthy()
      await libr.shelves.loadItems()
      expect(libr.shelves.count()).toEqual(createShelves.length)
      expect(libr.shelves.getItems().map((shelf) => shelf.slug).sort()).toEqual(createShelves.map((o) => o.slug).sort())
    })

    it('can be updated to DB', async () => {
      const em = <SqlEntityManager>DI.em.fork()
      await em.find(BookEntity, {})

      // Fetch by id
      let shelf = await em.findOne(LibraryEntity, { slug }, {
        populate: ['shelves', 'shelves.books', 'shelves.books.tags']
      })

      const changes = <any>{ shelves: updatedShelves }
      shelf = <any>helpers.persistNestedCollection(em, LibraryEntity, shelf, changes)

      await em.flush()

      expect(shelf).toBeTruthy()
      expect(shelf.shelves).toBeTruthy()
    })

    it('can be queried (again) from DB', async () => {
      const em = DI.em.fork()
      const libr = await em.findOne(LibraryEntity, { slug })

      expect(libr).toBeTruthy()
      expect(libr.shelves).toBeTruthy()
      await libr.shelves.loadItems()
      expect(libr.shelves.count()).toEqual(updatedShelves.length)
      expect(libr.shelves.getItems().map((shelf) => shelf.slug).sort()).toEqual(updatedShelves.map((o) => o.slug).sort())
    })
  })
})
