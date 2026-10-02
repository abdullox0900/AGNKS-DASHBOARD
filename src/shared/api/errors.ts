import { dictionaries, translate, type DictKey } from '@/shared/config/dictionaries'
import { getLocale } from '@/shared/config/uiStore'

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

/** Localized message for an API error code (falls back to a generic one). */
export function apiErrorMessage(err: ApiError): string {
  // a few backend refusals carry a specific reason in details.message
  const reasonKey = `stations.${String(err.details?.message ?? '')}` as DictKey
  if (reasonKey in dictionaries.uz) return translate(getLocale(), reasonKey)
  const key = `error.${err.code}` as DictKey
  return translate(getLocale(), key in dictionaries.uz ? key : 'common.error_generic')
}

export function isClientError(err: unknown): boolean {
  return err instanceof ApiError && err.code !== 'INTERNAL_ERROR' && err.code !== 'NETWORK_ERROR'
}
