import { z } from 'zod'

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD')

export const searchSchema = z
  .object({
    dateFrom: dateString,
    dateTo: dateString,
    hospcode: z.string().optional(),
    birthFrom: dateString.optional(),
    birthTo: dateString.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
  })
  .refine(
    (d) => new Date(d.dateTo) >= new Date(d.dateFrom),
    { message: 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น', path: ['dateTo'] }
  )
  .refine(
    (d) => !(d.birthFrom && !d.birthTo) && !(!d.birthFrom && d.birthTo),
    { message: 'ต้องระบุวันเกิดเริ่มต้นและสิ้นสุดพร้อมกัน', path: ['birthFrom'] }
  )

export type SearchInput = z.infer<typeof searchSchema>
