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

const makeShelf = (slug: string, ...books: BookEntity[]): LibraryShelfEntity => {
  const b = new LibraryShelfEntity()
  b.slug = slug
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
      ${'comic'}
      ${'teletubies'}
      ${'children'}
    `('can create bookTags', async ({ slug }) => {
      const resp = await client.createNewBookTag(slug)
      expect(resp.httpStatusCode).toEqual(200)
      expect(resp.data).toBeTruthy()
      expect(resp.data.slug).toEqual(slug)
    })

    it('can list bookTags', async () => {
      const expectedList = new Set(['history', 'textbook', 'teletubies', 'children', 'comic'])
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
      ${'1405281081'}   | ${'Teletubbies: A Rainy Day (Teletubbies board storybooks)'} | ${'teletubies,comic'}
      ${'043913854x'}   | ${'Lift-the-flap Board Book: Big Hug (teletubbies)'}         | ${'teletubies,children'}
      ${'056338462X'}   | ${'Teletubbies Craft Book'}                                  | ${'teletubies'}
      ${'1582400229'}   | ${'WildC.A.T.S/ X-men (Wildcats, Xmen)'}                     | ${'xmen'}
      ${'0785102345'}   | ${'Xmen 2099 TPB (Oasis, Volume 1)'}                         | ${'xmen,comic'}
      ${'1904419402'}   | ${'Uncanny X-Men: Second Gaenesis! (Uncanny Xmen)'}          | ${'history,xmen'}
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
      const createdResp = await client.createNewLibrary(targetSlug, [])
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
      const createNewResp = await client.createNewLibrary(existingSlug, [])
      expect(createNewResp.httpStatusCode).toEqual(500)
      expect(createNewResp.error).toBeTruthy()
      expect(createNewResp.error).toMatch(/Internal Server Error/)  // Error should have been wrapped.
    })

    it('Can update items from CrudController', async () => {
      // Create new one
      const targetSlug = 'history'
      const shelves = [
        makeShelf(
          'bob',
          ...makeBooks(
            '0199987556', 'A Brief History of the Romans',
            '1319022545', 'Ways of the World: A Brief Global History, Volume II',
            '1447123581', 'A Brief History of Computing',
          )
        )
      ]
      const createdResp = await client.createNewLibrary(targetSlug, [])
      expect(createdResp.httpStatusCode).toEqual(200)
      expect(createdResp.data.slug).toEqual(targetSlug)

      await client.updateLibrary(targetSlug, shelves)

      // Update multiple items in the shelf
      const afterCreated = await client.getLibrary(targetSlug)
      expect(afterCreated.httpStatusCode).toEqual(200)
      expect(afterCreated.data.slug).toEqual(targetSlug)
      expect(afterCreated.data.shelves.map((o) => o.slug)).toEqual(shelves.map((o) => o.slug))
    })

    // Unrelated chain
    it('Can create nested item in CrudController', async () => {
      // Create new one
      const targetSlug = 'teletubbies'
      const shelves = [
        makeShelf(
          'kids',
          ...makeBooks(
            '1405281081', 'Teletubbies: A Rainy Day (Teletubbies board storybooks)',
            '043913854x', 'Lift-the-flap Board Book: Big Hug (teletubbies)',
            '056338462X', 'Teletubbies Craft Book',
          )
        )
      ]
      const createdResp = await client.createNewLibrary(targetSlug, shelves)
      expect(createdResp.httpStatusCode).toEqual(200)
      expect(createdResp.data.slug).toEqual(targetSlug)

      // Update multiple items in the shelf
      const afterCreated = await client.getLibrary(targetSlug)
      expect(afterCreated.httpStatusCode).toEqual(200)
      expect(afterCreated.data.slug).toEqual(targetSlug)
      expect(afterCreated.data.shelves.map((o) => o.slug).sort()).toEqual(shelves.map((o) => o.slug).sort())
    })

    it('Can update nested item in Crud Controller', async () => {
      // Create new one
      const targetSlug = 'xmen'
      const shelves = [
        makeShelf(
          'xmen',
          ...makeBooks(
            '1582400229', 'WildC.A.T.S/ X-men (Wildcats, Xmen)',
            '0785102345', 'Xmen 2099 TPB (Oasis, Volume 1)',
            '1904419402', 'Uncanny X-Men: Second Gaenesis! (Uncanny Xmen)',
          )
        )
      ]
      const createdResp = await client.createNewLibrary(targetSlug, shelves)
      expect(createdResp.httpStatusCode).toEqual(200)
      expect(createdResp.data.slug).toEqual(targetSlug)

      // Update multiple items in the shelf
      const afterCreated = await client.getLibrary(targetSlug)
      expect(afterCreated.httpStatusCode).toEqual(200)
      expect(afterCreated.data.slug).toEqual(targetSlug)
      expect(afterCreated.data.shelves.map((o) => o.slug).sort()).toEqual(shelves.map((o) => o.slug).sort())

      // const additionalBooks = [
      //   makeBook('8490248567', 'New Xmen 3 Imperial'),
      //   makeBook('8490248346', 'New Xmen 6 Ataque A Arma'),
      // ]
      // const newList = [
      //   ...books,
      //   ...additionalBooks,
      // ]
      // const updatedResp = await client.updateShelf(targetSlug, newList)
      // expect(updatedResp.httpStatusCode).toEqual(200)
      // expect(updatedResp.data.slug).toEqual(targetSlug)

      // // Update multiple items in the shelf
      // const afterUpdated = await client.getShelf(targetSlug)
      // expect(afterUpdated.httpStatusCode).toEqual(200)
      // expect(afterUpdated.data.slug).toEqual(targetSlug)
      // expect(afterUpdated.data.books.map((o) => o.isbn).sort()).toEqual(newList.map((o) => o.isbn).sort())
    })
  })

  // it('Can remove nested item in Crud Controller', async () => {
  //   // Create new one
  //   const targetSlug = 'magic'
  //   const books = [
  //     makeBook('0205718116', 'The Anthropology of Religion, Magic, and Witchcraft (3rd Edition)'),
  //     makeBook('0671646788', 'The Magic of Thinking Big'),
  //     makeBook('1577666135', 'The Magic Garment: Principles of Costume Design'),
  //   ]
  //   const createdResp = await client.createNewShelf(targetSlug, books)
  //   expect(createdResp.httpStatusCode).toEqual(200)
  //   expect(createdResp.data.slug).toEqual(targetSlug)

  //   // Update multiple items in the shelf
  //   const afterCreated = await client.getShelf(targetSlug)
  //   expect(afterCreated.httpStatusCode).toEqual(200)
  //   expect(afterCreated.data.slug).toEqual(targetSlug)
  //   expect(afterCreated.data.books.map((o) => o.isbn).sort()).toEqual(books.map((o) => o.isbn).sort())

  //   const removedList = [
  //     books[0],
  //     books[1],
  //   ]
  //   const updatedResp = await client.updateShelf(targetSlug, removedList)
  //   expect(updatedResp.httpStatusCode).toEqual(200)
  //   expect(updatedResp.data.slug).toEqual(targetSlug)

  //   // Update multiple items in the shelf
  //   const afterUpdated = await client.getShelf(targetSlug)
  //   expect(afterUpdated.httpStatusCode).toEqual(200)
  //   expect(afterUpdated.data.slug).toEqual(targetSlug)
  //   expect(afterUpdated.data.books.map((o) => o.isbn).sort()).toEqual(removedList.map((o) => o.isbn).sort())
  // })

  // it('Can empty the items in Crud Controller', async () => {
  //   // Create new one
  //   const targetSlug = 'swift'
  //   const books = [
  //     makeBook('0134044703', 'Swift for Beginners: Develop and Design'),
  //     makeBook('067233724x', 'Swift In 24 Hours, Sams Teach Yourself (sams Teach Yourself -- Hours)'),
  //     makeBook('0393930653', 'The Essential Writings of Jonathan Swift (First Edition) (Norton Critical Editions)'),
  //   ]
  //   const createdResp = await client.createNewShelf(targetSlug, books)
  //   expect(createdResp.httpStatusCode).toEqual(200)
  //   expect(createdResp.data.slug).toEqual(targetSlug)

  //   // Update multiple items in the shelf
  //   const afterCreated = await client.getShelf(targetSlug)
  //   expect(afterCreated.httpStatusCode).toEqual(200)
  //   expect(afterCreated.data.slug).toEqual(targetSlug)
  //   expect(afterCreated.data.books.map((o) => o.isbn).sort()).toEqual(books.map((o) => o.isbn).sort())

  //   const updatedResp = await client.updateShelf(targetSlug, [])
  //   expect(updatedResp.httpStatusCode).toEqual(200)
  //   expect(updatedResp.data.slug).toEqual(targetSlug)

  //   // Update multiple items in the shelf
  //   const afterUpdated = await client.getShelf(targetSlug)
  //   expect(afterUpdated.httpStatusCode).toEqual(200)
  //   expect(afterUpdated.data.slug).toEqual(targetSlug)
  //   expect(afterUpdated.data.books.map((o) => o.isbn).length).toEqual(0)
  // })

  // it('Can update internal items in Crud Controller', async () => {
  //   // Create new one
  //   const targetSlug = 'transformer'
  //   const books = [
  //     makeBook('0134096401', 'Rotating Electric Machinery and Transformer Technology (4th Edition)'),
  //     makeBook('0824768019', 'Transformer and Inductor Design Handbook (Electrical engineering and electronics)'),
  //     makeBook('0835967506', 'Rotating Electric Machinery And Transformer Technology with some Typo!'),
  //     makeBook('0945495595', 'Transformer Exam Calculations #104'),
  //   ]
  //   const createdResp = await client.createNewShelf(targetSlug, books)
  //   expect(createdResp.httpStatusCode).toEqual(200)
  //   expect(createdResp.data.slug).toEqual(targetSlug)

  //   // Update multiple items in the shelf
  //   const afterCreated = await client.getShelf(targetSlug)
  //   expect(afterCreated.httpStatusCode).toEqual(200)
  //   expect(afterCreated.data.slug).toEqual(targetSlug)
  //   expect(afterCreated.data.books.map((o) => o.isbn).sort()).toEqual(books.map((o) => o.isbn).sort())

  //   const updatedItems = [
  //     books[0],
  //     books[1],
  //     makeBook('0835967506', 'Rotating Electric Machinery And Transformer Technology!'),
  //     books[3],
  //   ]
  //   const updatedResp = await client.updateShelf(targetSlug, updatedItems)
  //   expect(updatedResp.httpStatusCode).toEqual(200)
  //   expect(updatedResp.data.slug).toEqual(targetSlug)

  //   // Update multiple items in the shelf
  //   const afterUpdated = await client.getShelf(targetSlug)
  //   expect(afterUpdated.httpStatusCode).toEqual(200)
  //   expect(afterUpdated.data.slug).toEqual(targetSlug)
  //   expect(afterUpdated.data.books.find((o) => o.isbn === '0835967506')?.title).toEqual('Rotating Electric Machinery And Transformer Technology!')
  // })

  // it('Can update and remove and add internal items Crud Controller', async () => {
  //   // Create new one
  //   const targetSlug = 'complex'
  //   const books = [
  //     makeBook('0231157134', 'Transgender 101: A Simple Guide to a Complex Issue'),
  //     makeBook('9810939329', 'Simplicity in Complexity: An Introduction to Complex Systems'),
  //     makeBook('1442276711', 'TYPO! International Negotiation in a Complex World (New Millennium Books in International Studies)'),
  //     makeBook('1592537561', 'Universal Methods of Design: 100 Ways to Research Complex Problems, Develop Innovative Ideas, and Design Effective Solutions'),
  //   ]
  //   const createdResp = await client.createNewShelf(targetSlug, books)
  //   expect(createdResp.httpStatusCode).toEqual(200)
  //   expect(createdResp.data.slug).toEqual(targetSlug)

  //   // Update multiple items in the shelf
  //   const afterCreated = await client.getShelf(targetSlug)
  //   expect(afterCreated.httpStatusCode).toEqual(200)
  //   expect(afterCreated.data.slug).toEqual(targetSlug)
  //   expect(afterCreated.data.books.map((o) => o.isbn).sort()).toEqual(books.map((o) => o.isbn).sort())

  //   const updatedItems = [
  //     books[0],
  //     books[1],
  //     makeBook('1442276711', 'International Negotiation in a Complex World (New Millennium Books in International Studies)'), // Updated
  //     // Removed
  //     makeBook('0805841199', 'Human Factors in Simple and Complex Systems, Second Edition'), // added
  //   ]
  //   const updatedResp = await client.updateShelf(targetSlug, updatedItems)
  //   expect(updatedResp.httpStatusCode).toEqual(200)
  //   expect(updatedResp.data.slug).toEqual(targetSlug)

  //   // Update multiple items in the shelf
  //   const afterUpdated = await client.getShelf(targetSlug)
  //   expect(afterUpdated.httpStatusCode).toEqual(200)
  //   expect(afterUpdated.data.slug).toEqual(targetSlug)
  //   expect(afterUpdated.data.books.find((o) => o.isbn === '1442276711')?.title).toEqual('International Negotiation in a Complex World (New Millennium Books in International Studies)')
  //   expect(afterUpdated.data.books.map((o) => o.isbn).sort()).toEqual(updatedItems.map((o) => o.isbn).sort())
  // })
})