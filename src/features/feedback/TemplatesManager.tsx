import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { apiDeleteFeedbackTemplate, apiSaveFeedbackTemplate, type FeedbackTemplate } from '@/shared/api/client'
import { useFeedbackTemplates } from '@/shared/api/hooks'
import { useI18n } from '@/app/providers/I18nProvider'

const field =
  'w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[13.5px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-primary)]'

/** The list of ready-made replies the people who answer can pick from. Only the SEO edits it. */
export function TemplatesManager() {
  const { t } = useI18n()
  const { show } = useToast()
  const { mutate: globalMutate } = useSWRConfig()
  const { data: templates, mutate } = useFeedbackTemplates()
  const [editing, setEditing] = useState<FeedbackTemplate | 'new' | null>(null)

  async function remove(tpl: FeedbackTemplate) {
    try {
      await apiDeleteFeedbackTemplate(tpl.id)
      await mutate()
    } catch {
      show(t('common.error_generic'))
    }
  }

  if (editing !== null) {
    return (
      <TemplateForm
        key={editing === 'new' ? 'new' : editing.id}
        template={editing === 'new' ? null : editing}
        onDone={() => {
          setEditing(null)
          void mutate()
          void globalMutate('/admin/feedback-templates')
        }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-tertiary)]">{t('tpl.hint')}</p>
      <Button onClick={() => setEditing('new')}>
        <Plus size={15} /> {t('tpl.add')}
      </Button>
      {templates && templates.length === 0 && <p className="py-6 text-center text-[13px] text-[var(--color-ink-tertiary)]">{t('tpl.empty')}</p>}
      <ul className="divide-y divide-[var(--color-border)]">
        {templates?.map((tpl) => (
          <li key={tpl.id} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-[var(--color-ink)]">{tpl.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[12.5px] text-[var(--color-ink-secondary)]">{tpl.textUz}</p>
              {tpl.textRu && <p className="mt-0.5 line-clamp-1 text-[12px] text-[var(--color-ink-tertiary)]">RU: {tpl.textRu}</p>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditing(tpl)} aria-label={t('common.edit')}>
              <Pencil size={14} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void remove(tpl)} aria-label={t('common.delete')}>
              <Trash2 size={14} />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TemplateForm({ template, onDone, onCancel }: { template: FeedbackTemplate | null; onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const [title, setTitle] = useState(template?.title ?? '')
  const [uz, setUz] = useState(template?.textUz ?? '')
  const [ru, setRu] = useState(template?.textRu ?? '')
  const [saving, setSaving] = useState(false)
  const valid = title.trim().length >= 2 && uz.trim().length >= 2 && (ru.trim() === '' || ru.trim().length >= 2)

  async function save() {
    if (!valid) return
    setSaving(true)
    try {
      await apiSaveFeedbackTemplate({ id: template?.id, title: title.trim(), textUz: uz.trim(), textRu: ru.trim() || null })
      show(t('att.saved'))
      onDone()
    } catch {
      show(t('common.error_generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('tpl.title')}</label>
        <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder={t('tpl.title_ph')} className={`${field} h-10`} autoFocus />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('tpl.text_uz')}</label>
        <textarea value={uz} maxLength={1000} rows={4} onChange={(e) => setUz(e.target.value)} className={`${field} resize-y py-2`} />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('tpl.text_ru')}</label>
        <textarea value={ru} maxLength={1000} rows={4} onChange={(e) => setRu(e.target.value)} className={`${field} resize-y py-2`} />
        <p className="mt-1 text-[11.5px] text-[var(--color-ink-tertiary)]">{t('tpl.ru_hint')}</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!valid} loading={saving}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}
