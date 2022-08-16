import { SqlEntityManager } from "@mikro-orm/postgresql"
import { DI } from "kobp-mikroorm"
import { CriteriaLevelEntity, EmployeeEntity } from "../../entities"
import { prepareDependencies } from "../utils/di"

const make = {
  employee: (id: string, email: string, nameTh: string, nickname: string, directReport: EmployeeEntity | null): EmployeeEntity => {
    const emp = new EmployeeEntity()
    emp.employeeId = id
    emp.nameth = nameTh
    emp.nickname = nickname
    emp.email = email
    emp.directReport = directReport
    return emp
  },

  criteria: (title: string): CriteriaLevelEntity => {
    const o = new CriteriaLevelEntity()
    o.title = title
    return o
  },
}

const fixtures = (() => {
  const k = make.employee('P3041', 'k@where.com', 'พิชาน์', 'kem', null)
  const b = make.employee('W3039', 'b@where.com', 'วสันต์', 'bank', null)
  const p = make.employee('K1231', 'p@where.com', 'กิตติพัฒน์', 'peat', null)
  const a = make.employee('A1234', 'c@where.com', 'ชิติพัฒน์', 'arm', p)
  return {
    emp: { k, b, p, a },
    cri: {
      good: make.criteria('Good'),
      great: make.criteria('Great'),
      awesome: make.criteria('Awesome'),
    }
  }
})()

describe('Employee Flow', () => {
  beforeAll(async () => {
    await prepareDependencies()
    // destroy existing data
    const em = DI.em.fork() as SqlEntityManager
    await em.execute('DELETE FROM evaluation_record_entity;')
    await em.execute('DELETE FROM employee_entity;')
    await em.execute('DELETE FROM criteria_level_entity;')
  })

  afterAll(async () => {
    await DI.orm.close()
  })

  it.each`
    data
    ${fixtures.emp.k}
    ${fixtures.emp.b}
    ${fixtures.emp.p}
    ${fixtures.emp.a}
  `('can be created $data.employeeId', async ({ data }) => {
    const em = DI.em.fork()
    const rep = em.getRepository(EmployeeEntity)
    rep.persist(data)
    await rep.flush()

    const found = await rep.findOneOrFail({ employeeId: data.employeeId }, {
      populate: ['directReport'],
    })
    expect(found).toBeTruthy()
    expect(found.email).toEqual(data.email)
    expect(found.nameth).toEqual(data.nameth)
    expect(found.nickname).toEqual(data.nickname)
    expect(found.directReport?.employeeId).toEqual(data.directReport?.employeeId)
  })

  it.each`
    data
    ${fixtures.cri.good}
    ${fixtures.cri.great}
    ${fixtures.cri.awesome}
  `('can be created $data.title', async ({ data }) => {
      const em = DI.em.fork()
      const rep = em.getRepository(CriteriaLevelEntity)
      rep.persist(data)
      await rep.flush()
  
      const found = await rep.findOneOrFail({ id: data.id })
      expect(found).toBeTruthy()
      expect(found.id).toEqual(data.id)
      expect(found.title).toEqual(data.title)
    })
})
