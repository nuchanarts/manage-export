# Research: BGS Check Export

**Branch**: `001-check-export` | **Date**: 2026-05-16

## Decision Log

### 1. Excel Generation Library

- **Decision**: Use `exceljs` for backend Excel generation
- **Rationale**: Supports streaming for large datasets, actively maintained, good TypeScript types
- **Alternatives considered**: `xlsx` (sheetjs) — less streaming support for large files; `csv` export — not Excel format

### 2. Database Access Pattern

- **Decision**: Read-only connection to existing EHP CIS database via environment variable `DATABASE_URL`
- **Rationale**: No new DB needed; data already exists in the hospital system; minimizes risk
- **Alternatives considered**: Separate read replica — overkill for single-hospital LAN deployment

### 3. Frontend State Management

- **Decision**: React Query for server state; no global state manager
- **Rationale**: All state is server-derived (search results, record details); React Query handles caching, loading, error states cleanly
- **Alternatives considered**: Zustand — unnecessary for read-only data; Redux — too heavy

### 4. Authentication

- **Decision**: No authentication for v1 (LAN-only deployment, single hospital)
- **Rationale**: System runs inside hospital LAN; staff access is controlled at network level; adding auth adds complexity without value for v1
- **Alternatives considered**: JWT — would require user management system

### 5. Pagination Strategy

- **Decision**: Server-side pagination (page + pageSize params)
- **Rationale**: Large result sets (50k+ rows) cannot be loaded into browser memory; server paginates and frontend shows page controls
- **Alternatives considered**: Infinite scroll — harder to navigate to specific page; client-side — memory issues

### 6. Export Scope

- **Decision**: Export all filtered records (not just current page)
- **Rationale**: Users export to get the full dataset; paged export would be confusing
- **Alternatives considered**: Export current page only — defeats the purpose

### 7. Thai Date Handling

- **Decision**: Accept ISO dates in API; display in Thai Buddhist calendar format (พ.ศ.) in UI
- **Rationale**: Database may store Gregorian dates; staff familiar with Buddhist calendar; UI handles conversion
- **Alternatives considered**: Store BE dates — too risky to transform existing data
