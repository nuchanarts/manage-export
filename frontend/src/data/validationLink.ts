/**
 * Pure helper: maps a validation error context (field name + file name) to
 * a navigation target in the config pages.
 *
 * Returns:
 *   { menu: 'basic-config', categoryKey: 'occupation' }  — jump to that category
 *   { menu: 'eclaim-config', categoryKey: 'eclaim-inscl' } — jump to eclaim category
 *   { menu: 'global-search' }                             — no confident mapping; let user search
 *   null                                                   — no hint at all (structural error, not a code-mapping issue)
 *
 * Only REAL registry keys from categoryRegistry / eclaimRegistry are used here.
 * Do NOT add invented category keys.
 *
 * Basic-config registry keys (confirmed):
 *   occupation, religion, race, marriage, insurance, department, education,
 *   charge-list, person-kind, procedure, fp-method, vaccine-prenatal,
 *   vaccine-0-1y, vaccine-1-5y, vaccine-school, vaccine-all, chronic-status,
 *   accident-entry, injury-type, urgency-level, rehab-code, pp-special-code,
 *   chronic-disease, clinic, drug-list, drug-ned-reason, diagnosis-type,
 *   accident-place, vehicle-type, service-entry, lab-value-map
 *
 * Eclaim-config registry keys (confirmed):
 *   eclaim-inscl, eclaim-marriage, eclaim-drug-list, eclaim-charge,
 *   eclaim-clinic, eclaim-drug-ned
 */

export interface NavTarget {
  menu: string
  categoryKey?: string
}

/**
 * Hint object describing the context of a validation error.
 * Callers typically pass the field name from FieldError/ErrorGroupSummary,
 * and optionally the file name.
 */
export interface ValidationHint {
  /** Field name as it appears in the 43-file schema (e.g. "OCCUPA", "NATION") */
  field: string
  /** File name (e.g. "PERSON.txt") — used for disambiguation */
  fileName?: string
}

// ── Field-level mapping (field name → basic-config category key) ─────────────
// These are 43-file field names (CAPS) that directly correspond to a registry category.
// Conservative: only add when we are confident the unmapped-code error is fixed
// by editing that specific category.
const FIELD_TO_BASIC_CATEGORY: Record<string, string> = {
  // Person file fields
  OCCUPA:    'occupation',
  NATION:    'race',
  RELIGION:  'religion',
  MARRIAGE:  'marriage',
  EDUCATE:   'education',
  TYPEAREA:  'person-kind',
  PTTYPE:    'insurance',

  // Service-level fields
  INSTYPE:   'insurance',
  INSTTMAIN: 'insurance',
  INSTTSUB:  'insurance',

  // Department / clinic
  SPCLTY:    'department',
  CLINIC:    'clinic',

  // Diagnosis
  DIAGTYPE:  'diagnosis-type',

  // Procedure
  OPER:      'procedure',
  OPERTYPE:  'procedure',

  // Family planning
  FPTYPE:    'fp-method',

  // Vaccine
  VACCINE:   'vaccine-all',

  // Accident / ER
  ACCIDENT_CAUSE: 'accident-entry',   // accident cause / entry type
  INJTYPE:        'injury-type',
  VEHTYPE:        'vehicle-type',
  AEPLACE:        'accident-place',
  URGENCY:        'urgency-level',

  // Service entry
  OVSTIST:   'service-entry',
  TYPEIN:    'service-entry',

  // Drug
  DRUGNAME:  'drug-list',
  DIDTYPE:   'drug-list',
  NED:       'drug-ned-reason',

  // Lab
  LABCODE:   'lab-value-map',

  // Rehab
  REHABCODE: 'rehab-code',

  // PP special
  PP_SPECIAL_CODE: 'pp-special-code',

  // Chronic
  TYPEDIS:   'chronic-status',

  // Charge
  INCOME:    'charge-list',
}

// ── File+field combination overrides ─────────────────────────────────────────
// When the same field name appears in multiple files with different meanings,
// use this to be more specific.
// Key format: "<FILENAME_UPPER>:<FIELD_UPPER>"
const FILE_FIELD_OVERRIDES: Record<string, string> = {
  // PTTYPE in service files → insurance mapping
  'OPD.TXT:PTTYPE':    'insurance',
  'IPD.TXT:PTTYPE':    'insurance',
  'ADP.TXT:PTTYPE':    'insurance',
  'ER.TXT:PTTYPE':     'insurance',
  // eclaim context — inscl vs basic insurance
  'CLAIMST.TXT:PTTYPE': 'insurance',
}

// ── eclaim field mappings ─────────────────────────────────────────────────────
// Fields that appear in eclaim-context files map to eclaim-config categories.
const ECLAIM_FILE_PREFIXES = ['ECLAIM', 'CLAIMST', 'CLAIMOPD', 'CLAIMIMP', 'CLAIMDT']

const FIELD_TO_ECLAIM_CATEGORY: Record<string, string> = {
  INSCL:    'eclaim-inscl',
  PTTYPE:   'eclaim-inscl',    // in eclaim context
  MARRIAGE: 'eclaim-marriage',
  DRUGNAME: 'eclaim-drug-list',
  DIDTYPE:  'eclaim-drug-list',
  ADPCODE:  'eclaim-charge',
}

/**
 * Determines whether a file name is likely an eclaim file.
 * Eclaim files typically start with known eclaim prefixes.
 */
function isEclaimFile(fileName: string): boolean {
  const upper = fileName.toUpperCase().replace('.TXT', '')
  return ECLAIM_FILE_PREFIXES.some(p => upper.startsWith(p))
}

/**
 * Maps a validation error hint to a navigation target.
 *
 * Strategy:
 * 1. Check file+field override table first (most specific).
 * 2. If it's an eclaim file, check eclaim field table.
 * 3. Check the basic field table.
 * 4. If field is known but no confident category → global-search (user can search).
 * 5. Structural errors (MISSING_COLUMN etc.) → null (no jump makes sense).
 *
 * Returns null when no jump button should be shown at all.
 */
export function mapValidationToCategory(hint: ValidationHint): NavTarget | null {
  const fieldUpper = hint.field.toUpperCase().trim()
  const fileUpper  = (hint.fileName ?? '').toUpperCase().trim()

  if (!fieldUpper) return null

  // 1. File+field override (most specific)
  if (fileUpper) {
    const overrideKey = `${fileUpper}:${fieldUpper}`
    const override = FILE_FIELD_OVERRIDES[overrideKey]
    if (override) {
      return { menu: 'basic-config', categoryKey: override }
    }
  }

  // 2. eclaim file context
  if (fileUpper && isEclaimFile(fileUpper)) {
    const eclaimCat = FIELD_TO_ECLAIM_CATEGORY[fieldUpper]
    if (eclaimCat) {
      return { menu: 'eclaim-config', categoryKey: eclaimCat }
    }
  }

  // 3. Basic-config field mapping
  const basicCat = FIELD_TO_BASIC_CATEGORY[fieldUpper]
  if (basicCat) {
    return { menu: 'basic-config', categoryKey: basicCat }
  }

  // 4. Field is present in data but we don't have a specific category mapping.
  // Offer global-search so the user can find the code themselves.
  // Only do this for code-like fields (all-caps, no spaces → looks like a 43-file field).
  if (/^[A-Z][A-Z0-9_]*$/.test(fieldUpper)) {
    return { menu: 'global-search' }
  }

  // 5. No useful hint
  return null
}
