import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import useSWR, { useSWRConfig } from 'swr'
import { ArrowLeft, ExternalLink, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Avatar } from '@/shared/ui/Avatar'
import { Drawer } from '@/shared/ui/Drawer'
import { ErrorState } from '@/shared/ui/ErrorState'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useToast } from '@/shared/ui/Toast'
import { Linkified } from '@/features/changelog/Linkified'
import { PostForm } from '@/features/changelog/PostForm'
import { apiChangelogGet, apiChangelogRemove } from '@/shared/api/changelog'
import { useAvatars } from '@/shared/api/hooks'
import { ApiError } from '@/shared/api/errors'
import { usePermission } from '@/shared/lib/permissions'
import { formatDateLong } from '@/shared/lib/dates'
import { useI18n } from '@/app/providers/I18nProvider'

/** One entry, opened: title, who/when, the picture, the whole text and the link. Plain page, no card. */
export function ChangelogPostPage() {
  const { t } = useI18n()
  const { show } = useToast()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { mutate: globalMutate } = useSWRConfig()
  const canManage = usePermission('changelog.manage')
  const { data: avatars } = useAvatars()
  const { data: post, error, isLoading, mutate } = useSWR(['changelog-post', id], () => apiChangelogGet(id))
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function remove() {
    try {
      await apiChangelogRemove(id)
      show(t('changelog.deleted'))
      void globalMutate('/admin/changelog')
      navigate('/changelog', { replace: true })
    } catch {
      show(t('common.error_generic'))
    }
  }

  const back = (
    <Link to="/changelog" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-ink-tertiary)] transition-colors hover:text-[var(--color-ink)]">
      <ArrowLeft size={15} /> {t('changelog.title')}
    </Link>
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[860px] space-y-4">
        {back}
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !post) {
    const missing = error instanceof ApiError && error.code === 'NOT_FOUND'
    return (
      <div className="mx-auto max-w-[860px] space-y-4">
        {back}
        <ErrorState message={missing ? t('changelog.not_found') : t('common.load_failed')} onRetry={missing ? undefined : () => mutate()} />
      </div>
    )
  }

  const edited = new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 60_000

  return (
    <article className="mx-auto max-w-[860px]">
      <div className="flex items-center justify-between gap-3">
        {back}
        {canManage && (
          <div className="flex items-center gap-1">
            {confirming ? (
              <>
                <Button size="sm" variant="danger" onClick={remove}>
                  {t('changelog.confirm_delete')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} aria-label={t('common.cancel')}>
                  <X size={14} />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  <Pencil size={14} /> {t('changelog.edit_post')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label={t('changelog.delete')} title={t('changelog.delete')}>
                  <Trash2 size={14} />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <h1 className="mt-6 text-[32px] font-bold leading-tight tracking-tight text-[var(--color-ink)]">{post.title}</h1>

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-[var(--color-ink-tertiary)]">
        <span className="flex items-center gap-2">
          <Avatar src={avatars?.[post.authorId]} name={post.authorName} size={22} />
          <span className="font-medium text-[var(--color-ink-secondary)]">{post.authorName ?? '—'}</span>
        </span>
        <span>{formatDateLong(post.createdAt)}</span>
        {post.version && <span className="font-mono">v{post.version.replace(/^v/i, '')}</span>}
        {edited && <span>· {t('changelog.edited')}</span>}
      </p>

      <hr className="my-6 border-[var(--color-border)]" />

      {post.image && <img src={post.image} alt="" className="mb-6 max-h-[560px] w-full rounded-lg border border-[var(--color-border)] object-contain" />}

      <div className="space-y-3.5 text-[15.5px] leading-[1.75] text-[var(--color-ink)]">
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
          className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--color-border-strong)] px-4 text-[13.5px] font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          {post.linkLabel || t('changelog.link_default')} <ExternalLink size={15} />
        </a>
      )}

      <Drawer open={editing} onClose={() => setEditing(false)} title={t('changelog.edit_post')} width={520}>
        {editing && (
          <PostForm
            post={post}
            onDone={() => {
              setEditing(false)
              void mutate()
              void globalMutate('/admin/changelog')
            }}
          />
        )}
      </Drawer>
    </article>
  )
}
