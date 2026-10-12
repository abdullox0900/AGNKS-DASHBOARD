import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { apiChangelogCreate, apiChangelogUpdate, type ChangelogInput, type ChangelogPost } from '@/shared/api/changelog'
import { fileToPostImageDataUrl } from '@/shared/lib/image'
import { useI18n } from '@/app/providers/I18nProvider'

const BODY_MAX = 5000

const fieldClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-primary)]'

export function PostForm({ post, onDone }: { post: ChangelogPost | null; onDone: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(post?.title ?? '')
  const [version, setVersion] = useState(post?.version ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [linkUrl, setLinkUrl] = useState(post?.linkUrl ?? '')
  const [linkLabel, setLinkLabel] = useState(post?.linkLabel ?? '')
  const [image, setImage] = useState<string | null>(post?.image ?? null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const urlOk = linkUrl.trim() === '' || /^https?:\/\/[^\s]+$/i.test(linkUrl.trim())
  const valid = title.trim().length >= 2 && body.trim().length >= 1 && body.length <= BODY_MAX && urlOk

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      setImage(await fileToPostImageDataUrl(file))
    } catch (err) {
      const code = (err as Error).message
      show(code === 'not_image' ? t('profile.photo_not_image') : code === 'too_big' ? t('profile.photo_too_big') : t('common.error_generic'))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function save() {
    if (!valid) return
    setSaving(true)
    const input: ChangelogInput = {
      title: title.trim(),
      body: body.trim(),
      version: version.trim() || null,
      linkUrl: linkUrl.trim() || null,
      linkLabel: linkUrl.trim() ? linkLabel.trim() || null : null,
      image,
    }
    try {
      if (post) await apiChangelogUpdate(post.id, input)
      else await apiChangelogCreate(input)
      show(t('changelog.saved'))
      onDone()
    } catch {
      show(t('common.error_generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-[1fr_110px] gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('changelog.f_title')}</label>
          <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder={t('changelog.f_title_ph')} className={`${fieldClass} h-11`} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('changelog.f_version')}</label>
          <input value={version} maxLength={20} onChange={(e) => setVersion(e.target.value)} placeholder="1.5" className={`${fieldClass} h-11`} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 flex items-center justify-between text-[13px] font-medium text-[var(--color-ink-secondary)]">
          {t('changelog.f_body')}
          <span className="tnum text-[11.5px] font-normal text-[var(--color-ink-tertiary)]">
            {body.length}/{BODY_MAX}
          </span>
        </label>
        <textarea value={body} maxLength={BODY_MAX} rows={9} onChange={(e) => setBody(e.target.value)} placeholder={t('changelog.f_body_ph')} className={`${fieldClass} resize-y py-2.5 leading-relaxed`} />
        <p className="mt-1 text-[11.5px] text-[var(--color-ink-tertiary)]">{t('changelog.f_body_hint')}</p>
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('changelog.f_image')}</label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        {image ? (
          <div className="relative">
            <img src={image} alt="" className="max-h-[220px] w-full rounded-xl border border-[var(--color-border)] object-contain" />
            <button
              type="button"
              onClick={() => setImage(null)}
              aria-label={t('changelog.f_image_remove')}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <Button type="button" variant="secondary" loading={busy} onClick={() => fileRef.current?.click()}>
            <ImagePlus size={15} /> {t('changelog.f_image_add')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_150px] gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('changelog.f_link')}</label>
          <input value={linkUrl} maxLength={500} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className={`${fieldClass} h-11 ${urlOk ? '' : 'border-[var(--color-danger)]'}`} />
          {!urlOk && <p className="mt-1 text-[11.5px] font-medium text-[var(--color-danger)]">{t('changelog.f_link_bad')}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('changelog.f_link_label')}</label>
          <input value={linkLabel} maxLength={60} disabled={!linkUrl.trim()} onChange={(e) => setLinkLabel(e.target.value)} placeholder={t('changelog.link_default')} className={`${fieldClass} h-11 disabled:opacity-50`} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={!valid} loading={saving}>
        {t('common.save')}
      </Button>
    </form>
  )
}
