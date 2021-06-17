import { BookEntity, ShelfEntity } from "../../entities"
import { makeDbConfig } from "../../orm.config"
import { Client } from "../utils/client"

const makeBook = (isbn: string, title: string): BookEntity => {
  const b = new BookEntity()
  b.isbn = isbn
  b.title = title
  return b
}

describe('ShelfController Endpoint', () => {
  const client = new Client({
    host: 'http://localhost:3456'
  })

  beforeAll(async () => {
    // This is very quick but ugly method for Clearing data; 
    // Normally one should use API to delete this. Or use 
    // other means to delete the items.
    const db = await makeDbConfig()
    await db.em.getRepository(ShelfEntity).nativeDelete({})
    await db.close()
  })

  it('Can list items from CrudController', async () => {
    // Empty
    const shelves = await client.listShelves()
    expect(shelves.httpStatusCode).toEqual(200)
    expect(shelves.data).toBeTruthy()
    expect(shelves.data.length).toBeGreaterThanOrEqual(0)

    // Create new one
    const targetSlug = 'test'
    const createdResp = await client.createNewShelf(targetSlug, [])
    expect(createdResp.httpStatusCode).toEqual(200)
    expect(createdResp.data).toBeTruthy()
    expect(createdResp.data.slug).toEqual(targetSlug)

    // One item created
    const afterCreated = await client.listShelves()
    expect(afterCreated.httpStatusCode).toEqual(200)
    expect(afterCreated.data.map((o) => o.slug)).toEqual([targetSlug])
  })

  it('Can update items from CrudController', async () => {
    // Create new one
    const targetSlug = 'history'
    const books = [
      makeBook('0199987556', 'A Brief History of the Romans'),
      makeBook('1319022545', 'Ways of the World: A Brief Global History, Volume II'),
      makeBook('1447123581', 'A Brief History of Computing'),
    ]
    const createdResp = await client.createNewShelf(targetSlug, [])
    expect(createdResp.httpStatusCode).toEqual(200)
    expect(createdResp.data.slug).toEqual(targetSlug)

    await client.updateShelf(targetSlug, books)

    // Update multiple items in the shelf
    const afterCreated = await client.getShelf(targetSlug)
    expect(afterCreated.httpStatusCode).toEqual(200)
    expect(afterCreated.data.slug).toEqual(targetSlug)
    expect(afterCreated.data.books.map((o) => o.isbn)).toEqual(books.map((o) => o.isbn))
  })

  it('Can create nested item in CrudController', async () => {
    // Create new one
    const targetSlug = 'teletubbies'
    const books = [
      makeBook('1405281081', 'Teletubbies: A Rainy Day (Teletubbies board storybooks)'),
      makeBook('043913854x', 'Lift-the-flap Board Book: Big Hug (teletubbies)'),
      makeBook('056338462X', 'Teletubbies Craft Book'),
    ]
    const createdResp = await client.createNewShelf(targetSlug, books)
    expect(createdResp.httpStatusCode).toEqual(200)
    expect(createdResp.data.slug).toEqual(targetSlug)

    // Update multiple items in the shelf
    const afterCreated = await client.getShelf(targetSlug)
    expect(afterCreated.httpStatusCode).toEqual(200)
    expect(afterCreated.data.slug).toEqual(targetSlug)
    expect(afterCreated.data.books.map((o) => o.isbn)).toEqual(books.map((o) => o.isbn))
  })

  it('Can update nested item in Crud Controller', async () => {
    // Create new one
    const targetSlug = 'xmen'
    const books = [
      makeBook('1582400229', 'WildC.A.T.S/ X-men (Wildcats, Xmen)'),
      makeBook('0785102345', 'Xmen 2099 TPB (Oasis, Volume 1)'),
      makeBook('1904419402', 'Uncanny X-Men: Second Genesis! (Uncanny Xmen)'),
    ]
    const createdResp = await client.createNewShelf(targetSlug, books)
    expect(createdResp.httpStatusCode).toEqual(200)
    expect(createdResp.data.slug).toEqual(targetSlug)

    // Update multiple items in the shelf
    const afterCreated = await client.getShelf(targetSlug)
    expect(afterCreated.httpStatusCode).toEqual(200)
    expect(afterCreated.data.slug).toEqual(targetSlug)
    expect(afterCreated.data.books.map((o) => o.isbn)).toEqual(books.map((o) => o.isbn))

    const additionalBooks = [
      makeBook('8490248567', 'New Xmen 3 Imperial'),
      makeBook('8490248346', 'New Xmen 6 Ataque A Arma'),
    ]
    const newList = [
      ...books,
      ...additionalBooks,
    ]
    const updatedResp = await client.updateShelf(targetSlug, newList)
    expect(updatedResp.httpStatusCode).toEqual(200)
    expect(updatedResp.data.slug).toEqual(targetSlug)

    // Update multiple items in the shelf
    const afterUpdated = await client.getShelf(targetSlug)
    expect(afterUpdated.httpStatusCode).toEqual(200)
    expect(afterUpdated.data.slug).toEqual(targetSlug)
    expect(afterUpdated.data.books.map((o) => o.isbn).sort()).toEqual(newList.map((o) => o.isbn).sort())
  })

  it('Can remove nested item in Crud Controller', async () => {
    // Create new one
    const targetSlug = 'magic'
    const books = [
      makeBook('0205718116', 'The Anthropology of Religion, Magic, and Witchcraft (3rd Edition)'),
      makeBook('0671646788', 'The Magic of Thinking Big'),
      makeBook('1577666135', 'The Magic Garment: Principles of Costume Design'),
    ]
    const createdResp = await client.createNewShelf(targetSlug, books)
    expect(createdResp.httpStatusCode).toEqual(200)
    expect(createdResp.data.slug).toEqual(targetSlug)

    // Update multiple items in the shelf
    const afterCreated = await client.getShelf(targetSlug)
    expect(afterCreated.httpStatusCode).toEqual(200)
    expect(afterCreated.data.slug).toEqual(targetSlug)
    expect(afterCreated.data.books.map((o) => o.isbn)).toEqual(books.map((o) => o.isbn))

    const removedList = [
      books[0],
      books[1],
    ]
    const updatedResp = await client.updateShelf(targetSlug, removedList)
    expect(updatedResp.httpStatusCode).toEqual(200)
    expect(updatedResp.data.slug).toEqual(targetSlug)

    // Update multiple items in the shelf
    const afterUpdated = await client.getShelf(targetSlug)
    expect(afterUpdated.httpStatusCode).toEqual(200)
    expect(afterUpdated.data.slug).toEqual(targetSlug)
    expect(afterUpdated.data.books.map((o) => o.isbn).sort()).toEqual(removedList.map((o) => o.isbn).sort())
  })

  it('Can empty the items in Crud Controller', async () => {
    // Create new one
    const targetSlug = 'swift'
    const books = [
      makeBook('0134044703', 'Swift for Beginners: Develop and Design'),
      makeBook('067233724x', 'Swift In 24 Hours, Sams Teach Yourself (sams Teach Yourself -- Hours)'),
      makeBook('0393930653', 'The Essential Writings of Jonathan Swift (First Edition) (Norton Critical Editions)'),
    ]
    const createdResp = await client.createNewShelf(targetSlug, books)
    expect(createdResp.httpStatusCode).toEqual(200)
    expect(createdResp.data.slug).toEqual(targetSlug)

    // Update multiple items in the shelf
    const afterCreated = await client.getShelf(targetSlug)
    expect(afterCreated.httpStatusCode).toEqual(200)
    expect(afterCreated.data.slug).toEqual(targetSlug)
    expect(afterCreated.data.books.map((o) => o.isbn)).toEqual(books.map((o) => o.isbn))

    const updatedResp = await client.updateShelf(targetSlug, [])
    expect(updatedResp.httpStatusCode).toEqual(200)
    expect(updatedResp.data.slug).toEqual(targetSlug)

    // Update multiple items in the shelf
    const afterUpdated = await client.getShelf(targetSlug)
    expect(afterUpdated.httpStatusCode).toEqual(200)
    expect(afterUpdated.data.slug).toEqual(targetSlug)
    expect(afterUpdated.data.books.map((o) => o.isbn).length).toEqual(0)
  })

  it('Can update internal items in Crud Controller', async () => {
    // Create new one
    const targetSlug = 'transformer'
    const books = [
      makeBook('0134096401', 'Rotating Electric Machinery and Transformer Technology (4th Edition)'),
      makeBook('0824768019', 'Transformer and Inductor Design Handbook (Electrical engineering and electronics)'),
      makeBook('0835967506', 'Rotating Electric Machinery And Transformer Technology with some Typo!'),
      makeBook('0945495595', 'Transformer Exam Calculations #104'),
    ]
    const createdResp = await client.createNewShelf(targetSlug, books)
    expect(createdResp.httpStatusCode).toEqual(200)
    expect(createdResp.data.slug).toEqual(targetSlug)

    // Update multiple items in the shelf
    const afterCreated = await client.getShelf(targetSlug)
    expect(afterCreated.httpStatusCode).toEqual(200)
    expect(afterCreated.data.slug).toEqual(targetSlug)
    expect(afterCreated.data.books.map((o) => o.isbn)).toEqual(books.map((o) => o.isbn))

    const updatedItems = [
      books[0],
      books[1],
      makeBook('0835967506', 'Rotating Electric Machinery And Transformer Technology!'),
      books[3],
    ]
    const updatedResp = await client.updateShelf(targetSlug, updatedItems)
    expect(updatedResp.httpStatusCode).toEqual(200)
    expect(updatedResp.data.slug).toEqual(targetSlug)

    // Update multiple items in the shelf
    const afterUpdated = await client.getShelf(targetSlug)
    expect(afterUpdated.httpStatusCode).toEqual(200)
    expect(afterUpdated.data.slug).toEqual(targetSlug)
    expect(afterUpdated.data.books.find((o) => o.isbn === '0835967506')?.title).toEqual('Rotating Electric Machinery And Transformer Technology!')
  })


  it('Can update and remove and add internal items Crud Controller', async () => {
    // Create new one
    const targetSlug = 'complex'
    const books = [
      makeBook('0231157134', 'Transgender 101: A Simple Guide to a Complex Issue'),
      makeBook('9810939329', 'Simplicity in Complexity: An Introduction to Complex Systems'),
      makeBook('1442276711', 'TYPO! International Negotiation in a Complex World (New Millennium Books in International Studies)'),
      makeBook('1592537561', 'Universal Methods of Design: 100 Ways to Research Complex Problems, Develop Innovative Ideas, and Design Effective Solutions'),
    ]
    const createdResp = await client.createNewShelf(targetSlug, books)
    expect(createdResp.httpStatusCode).toEqual(200)
    expect(createdResp.data.slug).toEqual(targetSlug)

    // Update multiple items in the shelf
    const afterCreated = await client.getShelf(targetSlug)
    expect(afterCreated.httpStatusCode).toEqual(200)
    expect(afterCreated.data.slug).toEqual(targetSlug)
    expect(afterCreated.data.books.map((o) => o.isbn)).toEqual(books.map((o) => o.isbn))

    const updatedItems = [
      books[0],
      books[1],
      makeBook('1442276711', 'International Negotiation in a Complex World (New Millennium Books in International Studies)'), // Updated
      // Removed
      makeBook('0805841199', 'Human Factors in Simple and Complex Systems, Second Edition'), // added
    ]
    const updatedResp = await client.updateShelf(targetSlug, updatedItems)
    expect(updatedResp.httpStatusCode).toEqual(200)
    expect(updatedResp.data.slug).toEqual(targetSlug)

    // Update multiple items in the shelf
    const afterUpdated = await client.getShelf(targetSlug)
    expect(afterUpdated.httpStatusCode).toEqual(200)
    expect(afterUpdated.data.slug).toEqual(targetSlug)
    expect(afterUpdated.data.books.find((o) => o.isbn === '1442276711')?.title).toEqual('International Negotiation in a Complex World (New Millennium Books in International Studies)')
    expect(afterUpdated.data.books.map((o) => o.isbn).sort()).toEqual(updatedItems.map((o) => o.isbn).sort())
  })
})