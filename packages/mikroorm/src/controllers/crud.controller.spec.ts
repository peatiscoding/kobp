import { helpers } from "./crud.controller"

describe('CrudController', () => {
  describe('helper', () => {
    it.each`
      raw                                 | expected
      ${'$between(1,2)'}                  | ${{ $gte: 1, $lte: 2 }}
      ${'$between(15,2)'}                 | ${{ $gte: 15, $lte: 2 }}
      ${'$between(1500.1,2000.5)'}        | ${{ $gte: '1500.1', $lte: '2000.5' }}
      ${'$between(15_INIT,90_OK)'}        | ${{ $gte: '15_INIT', $lte: '90_OK' }}
      ${'alpha(abc)'}                     | ${{ $eq: 'alpha(abc)'}}
      ${'$in(15_INIT,90_OK)'}             | ${{ $in: ['15_INIT', '90_OK'] }}
      ${'$in(15,90)'}                     | ${{ $in: ['15', '90'] }}
      ${'$in((15),(90))'}                 | ${{ $in: ['(15)', '(90)'] }}
      ${'$gt(15)'}                        | ${{ $gt: '15' }}
      ${'$lt(15)'}                        | ${{ $lt: '15' }}
      ${'$gt(15_99-(30))'}                | ${{ $gt: '15_99-(30)' }}
      ${'$lt(15!#(17))'}                  | ${{ $lt: '15!#(17)' }}
      ${'$like(test)'}                    | ${{ $like: 'test' }}
      ${'$like(test(abc))'}               | ${{ $like: 'test(abc)' }}
      ${'$ilike(test)'}                   | ${{ $ilike: 'test' }}
      ${'$ilike(test(abc))'}              | ${{ $ilike: 'test(abc)' }}
      ${'$null'}                          | ${{ $eq: null }}
      ${'$notNull'}                       | ${{ $ne: null }}
    `('can convert $raw ===> SQL $expected', ({ raw, expected }) => {
      const res = helpers.evalQuery(raw, 'test')
      expect(res).toEqual(expected)
    })

    it.each`
      raw                                 | expected
      ${'$between($dt(1000),$dt(2000))'}  | ${{ $gte: '1970-01-01T00:00:01.000Z', $lte: '1970-01-01T00:00:02.000Z' }}
      ${'$between($dt(1000),abc)'}        | ${{ $gte: '1970-01-01T00:00:01.000Z', $lte: 'abc' }}
      ${'$between(def,$dt(2000))'}        | ${{ $gte: 'def', $lte: '1970-01-01T00:00:02.000Z' }}
      ${'$in($dt(1000),$dt(2000))'}       | ${{ $in: ['1970-01-01T00:00:01.000Z', '1970-01-01T00:00:02.000Z'] }}
      ${'$dt(1000)'}                      | ${{ $eq: '1970-01-01T00:00:01.000Z' }}
    `('can convert $raw which contains datetime ===> SQL $expected', ({ raw, expected }) => {
      const res = helpers.evalQuery(raw, 'test')
      expect(res).toEqual(expected)
    })
  })
})