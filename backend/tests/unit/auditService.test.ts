// backend/tests/unit/auditService.test.ts
// RED → GREEN: tests for auditService (recordMappingChange, getAudit, ensureAuditTable)

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import {
  recordMappingChange,
  getAudit,
  ensureAuditTable,
  _resetEnsureForTest,
} from '../../src/services/auditService'

beforeEach(() => {
  mockQuery.mockReset()
  _resetEnsureForTest()
})

// ─── ensureAuditTable ─────────────────────────────────────────────────────────

describe('ensureAuditTable', () => {
  it('calls CREATE TABLE IF NOT EXISTS exactly once', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
    await ensureAuditTable()
    expect(mockQuery).toHaveBeenCalledTimes(1)
    const sql: string = mockQuery.mock.calls[0][0]
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS')
    expect(sql).toContain('bgs_mapping_audit')
  })

  it('is memoized: second call does not re-run CREATE TABLE', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
    await ensureAuditTable()
    await ensureAuditTable()
    // CREATE TABLE called once (first call); second resolves immediately
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('_resetEnsureForTest allows re-running CREATE TABLE in tests', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
    await ensureAuditTable()
    _resetEnsureForTest()
    await ensureAuditTable()
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })
})

// ─── recordMappingChange ──────────────────────────────────────────────────────

describe('recordMappingChange', () => {
  it('inserts a parameterized audit row with correct values', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 }) // ensure + insert

    await recordMappingChange({
      registry: 'basic',
      category: 'occupation',
      code: '05',
      field: 'std_code',
      oldValue: null,
      newValue: '0510',
      actor: 'nurse01',
    })

    // Two calls: ensure table + INSERT
    expect(mockQuery).toHaveBeenCalledTimes(2)
    const [insertSql, insertParams] = mockQuery.mock.calls[1]
    expect(insertSql).toContain('INSERT INTO `bgs_mapping_audit`')
    expect(insertSql).toContain('VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)')
    expect(insertParams).toEqual(['basic', 'occupation', '05', 'std_code', null, '0510', 'nurse01'])
  })

  it('skips insert when oldValue === newValue (exact match)', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    await recordMappingChange({
      registry: 'basic',
      category: 'occupation',
      code: '05',
      field: 'std_code',
      oldValue: '0510',
      newValue: '0510',
      actor: 'nurse01',
    })

    // No calls at all — no-op skips ensureAuditTable too
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('skips insert when both are null (no-op)', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    await recordMappingChange({
      registry: 'basic',
      category: 'occupation',
      code: '05',
      field: 'std_code',
      oldValue: null,
      newValue: null,
      actor: 'x',
    })

    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('treats empty string and null as equivalent for no-op check', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    // old='', new=null → both normalize to null → no-op
    await recordMappingChange({
      registry: 'basic',
      category: 'occupation',
      code: '05',
      field: 'std_code',
      oldValue: '',
      newValue: null,
      actor: 'x',
    })

    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('does NOT throw when audit INSERT fails (best-effort)', async () => {
    // First call: ensureAuditTable succeeds; second call: INSERT throws
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ensure
      .mockRejectedValueOnce(new Error('Table not found')) // insert fails

    // Must not throw — swallows the error
    await expect(
      recordMappingChange({
        registry: 'basic',
        category: 'occupation',
        code: '05',
        field: 'std_code',
        oldValue: null,
        newValue: '0510',
        actor: 'x',
      })
    ).resolves.toBeUndefined()
  })

  it('stores null for empty-string new value (normalisation)', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    await recordMappingChange({
      registry: 'eclaim',
      category: 'eclaim-inscl',
      code: 'OFC',
      field: 'std_code',
      oldValue: 'OFC',
      newValue: '',   // empty string → should store null
      actor: 'admin',
    })

    const insertParams = mockQuery.mock.calls[1][1]
    expect(insertParams[5]).toBeNull()  // new_value param
    expect(insertParams[4]).toBe('OFC') // old_value param
  })

  it('includes the correct registry and category in the INSERT', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    await recordMappingChange({
      registry: 'eclaim',
      category: 'eclaim-charge',
      code: 'I001',
      field: 'std_code_e0',
      oldValue: null,
      newValue: 'BC99',
      actor: 'import',
    })

    const insertParams: unknown[] = mockQuery.mock.calls[1][1]
    expect(insertParams[0]).toBe('eclaim')
    expect(insertParams[1]).toBe('eclaim-charge')
    expect(insertParams[2]).toBe('I001')
    expect(insertParams[3]).toBe('std_code_e0')
    expect(insertParams[6]).toBe('import')
  })
})

// ─── getAudit ─────────────────────────────────────────────────────────────────

describe('getAudit', () => {
  it('calls ensureAuditTable then queries with registry + category parameterized', async () => {
    const fakeRows = [
      { ts: '2026-05-17T10:00:00', code: '05', field: 'std_code', old_value: null, new_value: '0510', actor: 'nurse01' },
    ]
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // ensure
      .mockResolvedValueOnce({ rows: fakeRows, rowCount: 1 }) // SELECT

    const result = await getAudit('basic', 'occupation')

    expect(mockQuery).toHaveBeenCalledTimes(2)
    const [selSql, selParams] = mockQuery.mock.calls[1]
    expect(selSql).toContain('FROM `bgs_mapping_audit`')
    expect(selSql).toContain('WHERE `registry` = ? AND `category` = ?')
    expect(selSql).toContain('ORDER BY')
    expect(selSql).toContain('DESC')
    expect(selParams).toEqual(['basic', 'occupation'])
    expect(result).toEqual(fakeRows)
  })

  it('clamps limit between 1 and 1000', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    await getAudit('basic', 'occupation', 9999)
    const sql1: string = mockQuery.mock.calls[1][0]
    expect(sql1).toContain('LIMIT 1000')

    _resetEnsureForTest()
    mockQuery.mockReset()
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    await getAudit('basic', 'occupation', -5)
    const sql2: string = mockQuery.mock.calls[1][0]
    expect(sql2).toContain('LIMIT 1')
  })

  it('defaults limit to 100 when not specified', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    await getAudit('basic', 'occupation')
    const selSql: string = mockQuery.mock.calls[1][0]
    expect(selSql).toContain('LIMIT 100')
  })

  it('returns empty array when no rows found', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    const result = await getAudit('eclaim', 'eclaim-inscl')
    expect(result).toEqual([])
  })
})
