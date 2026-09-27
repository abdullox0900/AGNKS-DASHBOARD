export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_FORBIDDEN'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_LOCKED'
  | 'NOT_FOUND'
  | 'DISPUTE_ALREADY_OPEN'
  | 'RATE_LIMITED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR'

export class ApiError extends Error {
  code: ErrorCode
  details?: Record<string, unknown>
  constructor(code: ErrorCode, details?: Record<string, unknown>) {
    super(code)
    this.code = code
    this.details = details
  }
}

export function isClientError(err: unknown): boolean {
  return err instanceof ApiError && err.code !== 'INTERNAL_ERROR' && err.code !== 'NETWORK_ERROR'
}
