import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../models/types'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public field?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const body: ApiError = { error: err.code, message: err.message }
    if (err.field) body.field = err.field
    res.status(err.statusCode).json(body)
    return
  }

  console.error('[ERROR]', err)
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
  } satisfies ApiError)
}
