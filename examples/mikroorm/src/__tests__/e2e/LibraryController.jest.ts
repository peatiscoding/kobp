import { BookEntity, BookTagEntity, LibraryEntity, LibraryShelfEntity } from "../../entities"
import { makeDbConfig } from "../../orm.config"
import { Client } from "../utils/client"

const makeBooks = (...args: string[]): BookEntity[] => {
  if (args.length % 2 !== 0) {
    throw new Error('invalid usage of fixture creation. makeBooks accept even arguments')
  }
  const out: BookEntity[] = []
  for(let i=0;i<args.length;i+=2) {
    const b = new BookEntity()
    b.isbn = args[i]
    b.title = args[i + 1]
    out.push(b)
  }
  return out
}

const makeShelf = (slug: string, title: string, ...books: BookEntity[]): LibraryShelfEntity => {
  const b = new LibraryShelfEntity()
  b.slug = slug
  b.title = title
  b.books.set(books)
  return b
}

describe('LibraryController Endpoint', () => {
  const client = new Client({
    host: 'http://localhost:3456'
  })

  beforeAll(async () => {
    // This is very quick but ugly method for Clearing data; 
    // Normally one should use API to delete this. Or use 
    // other means to delete the items.
    const db = await makeDbConfig()
    await db.em.getRepository(LibraryEntity).nativeDelete({})
    await db.em.getRepository(BookEntity).nativeDelete({})
    await db.em.getRepository(BookTagEntity).nativeDelete({})
    await db.close()
  })

  // BookTag (doesn't depends on anything!)
  describe('constraint less resource', () => {
    it.each`
      slug
      ${'history'}
      ${'textbook'}
      ${'teletubies'}
      ${'kids'}
      ${'children'}
    `('can create bookTags', async ({ slug }) => {
      const resp = await client.createNewBookTag(slug)
      expect(resp.httpStatusCode).toEqual(200)
      expect(resp.data).toBeTruthy()
      expect(resp.data.slug).toEqual(slug)
    })

    it('can list bookTags', async () => {
      const expectedList = new Set(['history', 'textbook', 'teletubies', 'children', 'kids'])
      const resp = await client.listBookTags(expectedList.size, 0)

      expect(resp.httpStatusCode).toEqual(200)
      expect(resp.data).toBeTruthy()
      expect(resp.data.length).toEqual(expectedList.size)
      expect(resp.data.filter((o) => expectedList.has(o.slug)).length).toEqual(expectedList.size)
    })
  })

  // Book (depends on BookTag with M-M rel)
  describe('dependent resource', () => {

    // silently added 'xmen' as a new tag.
    it.each`
      isbn              | title                                                        | tags
      ${'0199987556'}   | ${'A Brief History of the Romans'}                           | ${'history'}
      ${'1319022545'}   | ${'Ways of the World: A Brief Global History, Volume II'}    | ${'history'}
      ${'1447123581'}   | ${'A Brief History of Computing'}                            | ${'history'}
      ${'1405281081'}   | ${'Teletubbies: A Rainy Day (Teletubbies board storybooks)'} | ${'teletubies,kids'}
      ${'043913854x'}   | ${'Lift-the-flap Board Book: Big Hug (teletubbies)'}         | ${'teletubies,children'}
      ${'056338462X'}   | ${'Teletubbies Craft Book'}                                  | ${'teletubies'}
    `('can create book $title', async ({ isbn, title, tags }) => {
      const tagObjects = tags
        .split(',')
        .map((o: string) => o.trim())
        .filter(Boolean)
        .map((slug: string) => ({ slug }))
      const resp = await client.createNewBook(isbn, title, tagObjects)

      expect(resp.httpStatusCode).toEqual(200)
      expect(resp.data).toBeTruthy()
      expect(resp.data.title).toEqual(title)
      expect(resp.data.isbn).toEqual(isbn)
      expect(resp.data.tags).toBeTruthy()
      expect(resp.data.tags).toMatchObject(tagObjects)
    })

    it.each`
      isbn              | title                                                                     | tags
      ${'0785102345'}   | ${'Xmen 2099 TPB (Oasis, Volume 1)'}                                      | ${'xmen,first-volume,comic'}
      ${'1582400229'}   | ${'WildC.A.T.S/ X-men (Wildcats, Xmen)'}                                  | ${'xmen'}
      ${'1904419402'}   | ${'Uncanny X-Men: Second Gaenesis! (Uncanny Xmen)'}                       | ${'history,xmen'}
      ${'1593274246'}   | ${'Think Like a Programmer: An Introduction to Creative Problem Solving'} | ${'c++,programming'}
      ${'0321623215'}   | ${'C++ Standard Library, The: A Tutorial and Reference'}                  | ${'c++'}
    `('can create book $title with non-existing tags', async ({ isbn, title, tags }) => {
      const tagObjects = tags
        .split(',')
        .map((o: string) => o.trim())
        .filter(Boolean)
        .map((slug: string) => ({ slug }))
      const resp = await client.createNewBook(isbn, title, tagObjects)

      expect(resp.httpStatusCode).toEqual(200)
      expect(resp.data).toBeTruthy()
      expect(resp.data.title).toEqual(title)
      expect(resp.data.isbn).toEqual(isbn)
      expect(resp.data.tags).toBeTruthy()
      expect(resp.data.tags).toMatchObject(tagObjects)
    })
  })

  // Library has shelf, and depends on Book
  describe('nested dependent resource', () => {

    it('Can list libraries', async () => {
      // Empty
      const librs = await client.listLibraries()
      expect(librs.httpStatusCode).toEqual(200)
      expect(librs.data).toBeTruthy()
      expect(librs.data.length).toBeGreaterThanOrEqual(0)
  
      // Create new one
      const targetSlug = 'test'
      const createdResp = await client.createNewLibrary(targetSlug, 'Test', [])
      expect(createdResp.httpStatusCode).toEqual(200)
      expect(createdResp.data).toBeTruthy()
      expect(createdResp.data.slug).toEqual(targetSlug)
  
      // One item created
      const afterCreated = await client.listLibraries()
      expect(afterCreated.httpStatusCode).toEqual(200)
      expect(afterCreated.data.map((o) => o.slug)).toEqual([targetSlug])
    })

    it('will throw wrapped error when insert existing object', async () => {
      const existingSlug = 'test'
      const createNewResp = await client.createNewLibrary(existingSlug, 'Test', [])
      expect(createNewResp.httpStatusCode).toEqual(500)
      expect(createNewResp.error).toBeTruthy()
      expect(createNewResp.error).toMatch(/Internal Server Error/)  // Error should have been wrapped.
    })

    it('Can update items from CrudController', async () => {
      // Create new one
      const targetSlug = 'updatable'
      const sourceTitle = 'Updatable'
      // Update multiple items in the shelf
      const check = async (targetTitle: string, targetShelves: LibraryShelfEntity[]): Promise<void> => {
        const afterCreated = await client.getLibrary(targetSlug)
        const toIsbns = (shelves: LibraryShelfEntity[]) => shelves
          .map((s): BookEntity[] => s.books as any)
          .reduce((c, b) => [...c, ...b], [])
          .map((b) => b.isbn)
          .sort()
        expect(afterCreated.httpStatusCode).toEqual(200)
        expect(afterCreated.data.slug).toEqual(targetSlug)
        expect(afterCreated.data.title).toEqual(targetTitle)
        expect(afterCreated.data.shelves.map((o) => o.slug).sort()).toEqual(targetShelves.map((o) => o.slug).sort())
        expect(afterCreated.data.shelves.map((o) => o.title).sort()).toEqual(targetShelves.map((o) => o.title).sort())
        expect(toIsbns(afterCreated.data.shelves)).toEqual(toIsbns(targetShelves))
      }

      const initShelves = [
        makeShelf(
          'bob',
          'Bob',
          ...makeBooks(
            '0199987556', 'A Brief History of the Romans',
            '1319022545', 'Ways of the World: A Brief Global History, Volume II',
            '1447123581', 'A Brief History of Computing',
          )
        ),
      ]
      const createdResp = await client.createNewLibrary(targetSlug, sourceTitle, initShelves)
      expect(createdResp.httpStatusCode).toEqual(200)
      expect(createdResp.data.slug).toEqual(targetSlug)
      await check(sourceTitle, initShelves)

      // UPDATE: with shelves
      const newShelves = [
        makeShelf(
          'computer',
          'Computar', // typo (will be fixed in later API call)
          ...makeBooks(
            '1593274246', 'Think Like a Programmer: An Introduction to Creative Problem Solving',
            '0321623215', 'C++ Standard Library, The: A Tutorial and Reference',
          )
        ),
        makeShelf(
          'bob',
          'Bob',
          ...makeBooks(
            '0199987556', 'A Brief History of the Romans',
            '1447123581', 'A Brief History of Computing',
          )
        ),
      ]
      await client.updateLibraryShelves(targetSlug, newShelves)
      await check(sourceTitle, newShelves)

      // UPDATE: with shelves but "without" (undefined) books -- this will clean out all fields. as it flags "books" as dirty.
      // newShelves[0].title = 'Computer'
      // await client.updateLibraryShelvesWithoutBooks(targetSlug, newShelves)
      // await check(sourceTitle, newShelves)

      // UPDATE: title only
      const newTitle = `${sourceTitle} New`
      await client.updateLibraryTitle(targetSlug, newTitle)
      await check(newTitle, newShelves)

      // UPDATE: Title & Shelves
      const newShelves2 = [
        makeShelf(
          'computer',
          'Computer',
          ...makeBooks(
            '1593274246', 'Think Like a Programmer: An Introduction to Creative Problem Solving',
            '0321623215', 'C++ Standard Library, The: A Tutorial and Reference',
          )
        ),
      ]
      const newTitle2 = `${sourceTitle} New2`
      await client.updateLibraryTitleAndShelves(targetSlug, newTitle2, newShelves2)
      await check(newTitle2, newShelves2)
    })

    // Unrelated chain
    it('Can create nested item in CrudController', async () => {
      // Create new one
      const targetSlug = 'teletubbies'
      const shelves = [
        makeShelf(
          'kids',
          'Kids',
          ...makeBooks(
            '1405281081', 'Teletubbies: A Rainy Day (Teletubbies board storybooks)',
            '043913854x', 'Lift-the-flap Board Book: Big Hug (teletubbies)',
            '056338462X', 'Teletubbies Craft Book',
          )
        )
      ]
      const createdResp = await client.createNewLibrary(targetSlug, 'Teletubbies', shelves)
      expect(createdResp.httpStatusCode).toEqual(200)
      expect(createdResp.data.slug).toEqual(targetSlug)

      // Update multiple items in the shelf
      const afterCreated = await client.getLibrary(targetSlug)
      expect(afterCreated.httpStatusCode).toEqual(200)
      expect(afterCreated.data.slug).toEqual(targetSlug)
      expect(afterCreated.data.shelves.map((o) => o.slug).sort()).toEqual(shelves.map((o) => o.slug).sort())
    })
  })
})