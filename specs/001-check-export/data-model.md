# Data Model: BGS Check Export

**Branch**: `001-check-export` | **Date**: 2026-05-16

## Entities

### HealthRecord (Read-only from existing DB)

Represents a health check service record from the 43-file standard (CHECK file).

| Field | Type | Description |
|-------|------|-------------|
| HOSPCODE | string(5) | รหัสหน่วยบริการ (Hospital code) |
| PID | string(15) | ทะเบียนบุคคล (Person ID) |
| CID | string(13) | เลขที่บัตรประชาชน (National ID) |
| HN | string(15) | เลขที่ผู้ป่วยนอก (HN) |
| SEQ | string(16) | ลำดับที่รับบริการ |
| DATE_SERV | string(8) | วันที่รับบริการ (YYYYMMDD) |
| PRENAME | string(3) | คำนำหน้า |
| NAME | string(50) | ชื่อ |
| LNAME | string(50) | นามสกุล |
| SEX | string(1) | เพศ (1=ชาย, 2=หญิง) |
| BIRTH | string(8) | วันเกิด (YYYYMMDD) |
| TYPEAREA | string(1) | รหัสสถานะบุคคล |
| AREACODE | string(6) | รหัสพื้นที่ |

### SearchFilter (API input)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| dateFrom | string (ISO) | Yes | วันที่เริ่มต้น |
| dateTo | string (ISO) | Yes | วันที่สิ้นสุด |
| hospcode | string | No | รหัสหน่วยบริการ |
| birthFrom | string (ISO) | No | วันเกิดเริ่มต้น (optional) |
| birthTo | string (ISO) | No | วันเกิดสิ้นสุด (optional) |
| page | number | No | หน้าปัจจุบัน (default: 1) |
| pageSize | number | No | จำนวนต่อหน้า (default: 50, max: 200) |

### SearchResult (API output)

| Field | Type | Description |
|-------|------|-------------|
| data | HealthRecord[] | รายการข้อมูลในหน้านี้ |
| total | number | จำนวนรายการทั้งหมด |
| page | number | หน้าปัจจุบัน |
| pageSize | number | จำนวนต่อหน้า |
| totalPages | number | จำนวนหน้าทั้งหมด |

## Relationships

- `SearchFilter` → produces → `SearchResult`
- `SearchResult.data` → each item is a `HealthRecord`
- Export uses the same filter as search but fetches ALL records (no pagination)

## Validation Rules

- `dateFrom` must be a valid date
- `dateTo` must be >= `dateFrom`
- `pageSize` must be between 1 and 200
- If `birthFrom` provided, `birthTo` must also be provided (and vice versa)
