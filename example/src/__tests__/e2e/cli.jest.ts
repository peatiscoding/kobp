import { Loggy } from 'kobp'
import { fork } from "kobp-mikroorm"
import { prepareDependencies } from "../utils/di"

beforeAll(async() => {
  await prepareDependencies()
})

describe('fork', () => {

  it('can branch out the Loggy.log', () => {
    fork(async () => {
      Loggy.log('Hello')
      expect(true).toBeTruthy()
    })
  })
})