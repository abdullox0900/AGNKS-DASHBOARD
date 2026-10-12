import { Fragment, useEffect, useRef, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import { useSWRConfig } from 'swr'
import { ExternalLink, ImagePlus, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Avatar } from '@/shared/ui/Avatar'
import { Drawer } from '@/shared/ui/Drawer'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ErrorState } from '@/shared/ui/ErrorState'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useToast } from '@/shared/ui/Toast'
import { apiChangelogCreate, apiChangelogList, apiChangelogRemove, apiChangelogUpdate, type ChangelogInput, type ChangelogPost } from '@/shared/api/changelog'
import { useAvatars } from '@/shared/api/hooks'
import { useChangelogSeen } from '@/features/changelog/useChangelogUnread'
import { usePermission } from '@/shared/lib/permissions'
import { useAuthStore } from '@/shared/config/authStore'
import { fileToPostImageDataUrl } from '@/shared/lib/image'
import { formatDateTime } from '@/shared/lib/dates'
import { useI18n } from '@/app/providers/I18nProvider'

const BODY_MAX = 5000

/** "Yangilanishlar": what changed in the dashboard — written by the SEO, read by everyone, newest first. */
export function ChangelogPage() {
  const { t } = useI18n()
  const { show } = useToast()
  const { mutate: globalMutate } = useSWRConfig()
  const canManage = usePermission('changelog.manage')
  const userId = useAuthStore((s) => s.userId)
  const markSeen = useChangelogSeen((s) => s.markSeen)
  const { data: avatars } = useAvatars()
  const [editing, setEditing] = useState<ChangelogPost | 'new' | null>(null)

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(
    (index, prev: { nextCursor: string | null } | null) => (prev && !prev.nextCursor ? null : ['changelog', index === 0 ? '' : prev?.nextCursor]),
    ([, cursor]) => apiChangelogList((cursor as string) || undefined),
    { revalidateFirstPage: true },
  )
  const posts = data?.flatMap((p) => p.items) ?? []
  const hasMore = !!data && !!data[data.length - 1]?.nextCursor

  // opening the page = everything up to the newest post counts as read (clears the sidebar badge)
  const newest = data?.[0]?.items[0]?.createdAt
  useEffect(() => {
    if (userId && newest) markSeen(userId, newest)
  }, [userId, newest, markSeen])

  function refresh() {
    void mutate()
    void globalMutate('/admin/changelog') // the sidebar badge's copy of page one
  }

  async function remove(post: ChangelogPost) {
    try {
      await apiChangelogRemove(post.id)
      show(t('changelog.deleted'))
      refresh()
    } catch {
      show(t('common.error_generic'))
    }
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[18px] font-bold text-[var(--color-ink)]">
            <Sparkles size={18} className="text-[var(--color-primary)]" /> {t('changelog.title')}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-tertiary)]">{t('changelog.subtitle')}</p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing('new')}>
            <Plus size={15} /> {t('changelog.new_post')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={t('common.load_failed')} onRetry={() => mutate()} />
      ) : posts.length === 0 ? (
        <Card>
          <EmptyState title={t('changelog.empty')} />
        </Card>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} avatar={avatars?.[post.authorId]} canManage={canManage} onEdit={() => setEditing(post)} onDelete={() => remove(post)} />
        ))
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setSize(size + 1)} loading={isValidating}>
            {t('cd.load_more')}
          </Button>
        </div>
      )}

      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? t('changelog.new_post') : t('changelog.edit_post')} width={520}>
        {editing !== null && (
          <PostForm
            key={editing === 'new' ? 'new' : editing.id}
            post={editing === 'new' ? null : editing}
            onDone={() => {
              setEditing(null)
              refresh()
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

function PostCard({ post, avatar, canManage, onEdit, onDelete }: { post: ChangelogPost; avatar?: string; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const edited = post.updatedAt !== post.createdAt && new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 60_000

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {post.version && <Badge tone="primary">v{post.version.replace(/^v/i, '')}</Badge>}
            <h3 className="text-[16px] font-semibold text-[var(--color-ink)]">{post.title}</h3>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--color-ink-tertiary)]">
            <Avatar src={avatar} name={post.authorName} size={20} />
            <span className="font-medium text-[var(--color-ink-secondary)]">{post.authorName ?? '—'}</span>
            <span>· {formatDateTime(post.createdAt)}</span>
            {edited && <span>· {t('changelog.edited')}</span>}
          </p>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            {confirming ? (
              <>
                <Button size="sm" variant="danger" onClick={onDelete}>
                  {t('changelog.confirm_delete')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} aria-label={t('common.cancel')}>
                  <X size={14} />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={onEdit} aria-label={t('changelog.edit_post')} title={t('changelog.edit_post')}>
                  <Pencil size={14} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label={t('changelog.delete')} title={t('changelog.delete')}>
                  <Trash2 size={14} />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {post.image && <img src={post.image} alt="" className="mt-4 max-h-[460px] w-full rounded-xl border border-[var(--color-border)] object-contain" />}

      <div className="mt-4 space-y-2 text-[14px] leading-relaxed text-[var(--color-ink)]">
        {post.body.split(/\n{2,}/).map((paragraph, i) => (
          <p key={i} className="whitespace-pre-line break-words">
            <Linkified text={paragraph} />
          </p>
        ))}
      </div>

      {post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--color-primary)] px-4 text-[13.5px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-soft)]"
        >
          {post.linkLabel || t('changelog.link_default')} <ExternalLink size={15} />
        </a>
      )}
    </Card>
  )
}

/** Turns plain http(s) links inside the text into real links; everything else stays text (React escapes it). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<]+)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>
        const url = part.replace(/[.,;:!?)\]]+$/, '')
        const tail = part.slice(url.length)
        return (
          <Fragment key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline underline-offset-2">
              {url}
            </a>
            {tail}
          </Fragment>
        )
      })}
    </>
  )
}

const fieldClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-primary)]'

function PostForm({ post, onDone }: { post: ChangelogPost | null; onDone: () => void }) {
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
