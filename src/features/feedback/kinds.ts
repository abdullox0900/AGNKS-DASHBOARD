import type { FeedbackKind } from '@/shared/api/client'
import type { DictKey } from '@/shared/config/dictionaries'

export const KIND_LABEL: Record<FeedbackKind, DictKey> = {
  suggestion: 'disputes.kind.suggestion',
  complaint: 'disputes.kind.complaint',
  appeal: 'disputes.kind.appeal',
}

export const KIND_TONE: Record<FeedbackKind, 'primary' | 'danger' | 'warning'> = { suggestion: 'primary', complaint: 'danger', appeal: 'warning' }
