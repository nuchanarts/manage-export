// backend/tests/integration/drugCatalog.test.ts
import request from 'supertest'
import { DRUG_CATALOG_SQL } from '../../src/services/drugCatalog'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import app from '../../src/index'

const fakeRows = [
  {
    HospDrugCode: 'D001', ProductCat: '01', TMTID: 'TMT001', SpecPrep: '',
    GenericName: 'Amoxicillin', TradeName: 'Amoxil', DSFCode: '',
    DosageForm: 'Tablet', Strength: '500 mg', Content: '10 tab box',
    UnitPrice: 5.00, Distributor: 'PharmaCo', Manufacture: 'PharmaCo',
    NDC24: 'NDC001', ised: 'E', Packsize: '', Packprice: '',
    Updateflag: 'A', Datechange: '2026-05-17 00:00:00',
    DateUpdate: '2026-05-17 00:00:00', DateEffective: '2026-05-17 00:00:00',
  },
  {
    HospDrugCode: 'D002', ProductCat: '02', TMTID: 'TMT002', SpecPrep: '',
    GenericName: 'Paracetamol', TradeName: 'Tylenol', DSFCode: '',
    DosageForm: 'Syrup', Strength: '250 mg/5 ml', Content: '60 ml bottle',
    UnitPrice: 12.00, Distributor: 'MediDist', Manufacture: 'MediCo',
    NDC24: 'NDC002', ised: 'E*', Packsize: '', Packprice: '',
    Updateflag: 'A', Datechange: '2026-05-17 00:00:00',
    DateUpdate: '2026-05-17 00:00:00', DateEffective: '2026-05-17 00:00:00',
  },
]

describe('drug-catalog routes', () => {
  beforeEach(() => mockQuery.mockReset())

  describe('GET /api/drug-catalog', () => {
    it('returns rows as JSON array', async () => {
      mockQuery.mockResolvedValueOnce({ rows: fakeRows, rowCount: 2 })

      const res = await request(app).get('/api/drug-catalog')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body).toHaveLength(2)
      expect(res.body[0]).toMatchObject({ HospDrugCode: 'D001', GenericName: 'Amoxicillin' })
      expect(res.body[1]).toMatchObject({ HospDrugCode: 'D002', GenericName: 'Paracetamol' })
    })

    it('passes DRUG_CATALOG_SQL verbatim to query (no modification)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await request(app).get('/api/drug-catalog')

      expect(mockQuery).toHaveBeenCalledTimes(1)
      expect(mockQuery.mock.calls[0]![0]).toBe(DRUG_CATALOG_SQL)
    })

    it('returns 500 with DB error message when query throws', async () => {
      mockQuery.mockRejectedValueOnce(new Error("Table 'demo.drugitems' doesn't exist"))

      const res = await request(app).get('/api/drug-catalog')

      expect(res.status).toBe(500)
      expect(res.body).toMatchObject({
        error: 'DB_ERROR',
        message: expect.stringContaining("drugitems"),
      })
    })
  })

  describe('GET /api/drug-catalog/export', () => {
    it('returns 200 with spreadsheet content-type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: fakeRows, rowCount: 2 })

      const res = await request(app).get('/api/drug-catalog/export')

      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
    })

    it('sets content-disposition attachment with drug_catalog.xlsx filename', async () => {
      mockQuery.mockResolvedValueOnce({ rows: fakeRows, rowCount: 2 })

      const res = await request(app).get('/api/drug-catalog/export')

      expect(res.headers['content-disposition']).toContain('attachment')
      expect(res.headers['content-disposition']).toContain('drug_catalog.xlsx')
    })

    it('passes DRUG_CATALOG_SQL verbatim to query on export', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await request(app).get('/api/drug-catalog/export')

      expect(mockQuery).toHaveBeenCalledTimes(1)
      expect(mockQuery.mock.calls[0]![0]).toBe(DRUG_CATALOG_SQL)
    })

    it('returns 500 when query throws during export', async () => {
      mockQuery.mockRejectedValueOnce(new Error("Unknown column 'specprep'"))

      const res = await request(app).get('/api/drug-catalog/export')

      expect(res.status).toBe(500)
      expect(res.body).toMatchObject({
        error: 'DB_ERROR',
        message: expect.stringContaining("specprep"),
      })
    })
  })
})
