# Quickstart: BGS Check Export

**Branch**: `001-check-export` | **Date**: 2026-05-16

## Prerequisites

- Node.js 20 LTS
- npm 10+
- Access to EHP CIS database (connection string)

## Setup

```bash
# Install all dependencies (root, backend, frontend)
npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env and set DATABASE_URL to EHP CIS database

# Start development servers
npm run dev
# Backend: http://localhost:6000
# Frontend: http://localhost:6001
```

## Environment Variables (backend/.env)

```env
DATABASE_URL=mssql://user:password@host:1433/ehpcis
PORT=6000
NODE_ENV=development
```

## Test Scenarios (manual)

### Scenario 1: Search by date range
1. Open http://localhost:6001
2. Enter วันที่เริ่มต้น: 2026-05-01, วันที่สิ้นสุด: 2026-05-16
3. Click ค้นหา
4. Verify: table shows records with count displayed

### Scenario 2: Export to Excel
1. Complete Scenario 1
2. Click Export Excel
3. Verify: file downloads as `bgs-check-export-YYYYMMDD.xlsx`
4. Open file: verify all records present, all columns have data

### Scenario 3: Search without birth date
1. Leave วันเกิด fields empty
2. Enter date range and click ค้นหา
3. Verify: search works normally without birth date

### Scenario 4: View record detail
1. Complete Scenario 1
2. Click any row in results table
3. Verify: detail modal shows full record data

## Running Tests

```bash
# Backend unit + integration tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```
