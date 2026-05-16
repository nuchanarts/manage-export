# API Contracts: BGS Check Export

**Branch**: `001-check-export` | **Date**: 2026-05-16

Base URL: `http://localhost:3001/api`

---

## GET /health

Health check endpoint.

**Response 200**:
```json
{ "status": "ok" }
```

---

## GET /records

Search health records with filters.

**Query Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| dateFrom | string (YYYY-MM-DD) | Yes | วันที่เริ่มต้นรับบริการ |
| dateTo | string (YYYY-MM-DD) | Yes | วันที่สิ้นสุดรับบริการ |
| hospcode | string | No | รหัสหน่วยบริการ |
| birthFrom | string (YYYY-MM-DD) | No | วันเกิดเริ่มต้น |
| birthTo | string (YYYY-MM-DD) | No | วันเกิดสิ้นสุด |
| page | number | No | หน้า (default: 1) |
| pageSize | number | No | จำนวน/หน้า (default: 50, max: 200) |

**Response 200**:
```json
{
  "data": [
    {
      "HOSPCODE": "12345",
      "PID": "000000001",
      "CID": "1234567890123",
      "HN": "HN001",
      "SEQ": "SEQ001",
      "DATE_SERV": "20260516",
      "PRENAME": "นาย",
      "NAME": "สมชาย",
      "LNAME": "ใจดี",
      "SEX": "1",
      "BIRTH": "19800101",
      "TYPEAREA": "1",
      "AREACODE": "100101"
    }
  ],
  "total": 1250,
  "page": 1,
  "pageSize": 50,
  "totalPages": 25
}
```

**Response 400** (validation error):
```json
{
  "error": "VALIDATION_ERROR",
  "message": "dateFrom is required",
  "field": "dateFrom"
}
```

**Response 500**:
```json
{
  "error": "INTERNAL_ERROR",
  "message": "เกิดข้อผิดพลาดในการค้นหาข้อมูล"
}
```

---

## GET /records/export

Export all matching records as Excel file (no pagination).

**Query Parameters**: Same as `/records` except `page` and `pageSize` are ignored.

**Response 200**:
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="bgs-check-export-YYYYMMDD.xlsx"`
- Body: Excel binary stream

**Response 400**: Same validation error format as `/records`

**Response 404**:
```json
{
  "error": "NO_DATA",
  "message": "ไม่มีข้อมูลสำหรับ Export"
}
```

---

## GET /records/:pid

Get full detail of a single health record by PID.

**Path Parameters**:
- `pid` (string): ทะเบียนบุคคล

**Response 200**:
```json
{
  "HOSPCODE": "12345",
  "PID": "000000001",
  "CID": "1234567890123",
  "HN": "HN001",
  "SEQ": "SEQ001",
  "DATE_SERV": "20260516",
  "PRENAME": "นาย",
  "NAME": "สมชาย",
  "LNAME": "ใจดี",
  "SEX": "1",
  "BIRTH": "19800101",
  "TYPEAREA": "1",
  "AREACODE": "100101"
}
```

**Response 404**:
```json
{
  "error": "NOT_FOUND",
  "message": "ไม่พบข้อมูลที่ระบุ"
}
```
