import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useSWRInfinite from 'swr/infinite'
import { useSWRConfig } from 'swr'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Avatar } from '@/shared/ui/Avatar'
import { Drawer } from '@/shared/ui/Drawer'
import { ErrorState } from '@/shared/ui/ErrorState'
import { Skeleton } from '@/shared/ui/Skeleton'
import { PostForm } from '@/features/changelog/PostForm'
import { useChangelogSeen } from '@/features/changelog/useChangelogUnread'
import { apiChangelogList, type ChangelogListItem } from '@/shared/api/changelog'
import { useAvatars } from '@/shared/api/hooks'
import { usePermission } from '@/shared/lib/permissions'
import { useAuthStore } from '@/shared/config/authStore'
import { formatDateShort, formatMonthYear, monthKey } from '@/shared/lib/dates'
import { useI18n } from '@/app/providers/I18nProvider'

/**
 * "Yangilanishlar" — a plain, Notion-like list: month headings, one line per entry (date · title · version · author).
 * No cards, no pictures here; opening an entry shows the whole thing (ChangelogPostPage).
 */
export function ChangelogPage() {
  const { t } = useI18n()
  const { mutate: globalMutate } = useSWRConfig()
  const canManage = usePermission('changelog.manage')
  const userId = useAuthStore((s) => s.userId)
  const markSeen = useChangelogSeen((s) => s.markSeen)
  const { data: avatars } = useAvatars()
  const [composing, setComposing] = useState(false)

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(
    (index, prev: { nextCursor: string | null } | null) => (prev && !prev.nextCursor ? null : ['changelog', index === 0 ? '' : prev?.nextCursor]),
    ([, cursor]) => apiChangelogList((cursor as string) || undefined),
    { revalidateFirstPage: true },
  )
  const posts = data?.flatMap((p) => p.items) ?? []
  const hasMore = !!data && !!data[data.length - 1]?.nextCursor

  // opening the list = everything up to the newest entry counts as read (clears the sidebar badge)
  const newest = data?.[0]?.items[0]?.createdAt
  useEffect(() => {
    if (userId && newest) markSeen(userId, newest)
  }, [userId, newest, markSeen])

  // group by month, keeping the (already newest-first) order
  const months: { key: string; label: string; items: ChangelogListItem[] }[] = []
  for (const post of posts) {
    const key = monthKey(post.createdAt)
    const last = months[months.length - 1]
    if (last?.key === key) last.items.push(post)
    else months.push({ key, label: formatMonthYear(post.createdAt), items: [post] })
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[26px] font-bold tracking-tight text-[var(--color-ink)]">{t('changelog.title')}</h2>
          <p className="mt-1 text-[13px] text-[var(--color-ink-tertiary)]">{t('changelog.subtitle')}</p>
        </div>
        {canManage && (
          <Button onClick={() => setComposing(true)}>
            <Plus size={15} /> {t('changelog.new_post')}
          </Button>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={t('common.load_failed')} onRetry={() => mutate()} />
        ) : posts.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-[var(--color-ink-tertiary)]">{t('changelog.empty')}</p>
        ) : (
          months.map((m) => (
            <section key={m.key} className="mb-8">
              <h3 className="mb-1 border-b border-[var(--color-border)] px-2 pb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-tertiary)]">{m.label}</h3>
              <ul>
                {m.items.map((post) => (
                  <li key={post.id}>
                    <Link
                      to={`/changelog/${post.id}`}
                      className="group flex items-center gap-4 rounded-md px-2 py-2.5 outline-none transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)]"
                    >
                      <span className="tnum w-[64px] shrink-0 text-[12.5px] text-[var(--color-ink-tertiary)]">{formatDateShort(post.createdAt)}</span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--color-ink)] group-hover:text-[var(--color-primary)]">{post.title}</span>
                      {post.version && <span className="shrink-0 font-mono text-[12px] text-[var(--color-ink-tertiary)]">v{post.version.replace(/^v/i, '')}</span>}
                      <span className="flex shrink-0 items-center gap-2 text-[12.5px] text-[var(--color-ink-tertiary)]">
                        <span className="hidden sm:inline">{post.authorName}</span>
                        <Avatar src={avatars?.[post.authorId]} name={post.authorName} size={22} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {hasMore && (
          <div className="flex justify-center pb-6">
            <Button variant="ghost" onClick={() => setSize(size + 1)} loading={isValidating}>
              {t('cd.load_more')}
            </Button>
          </div>
        )}
      </div>

      <Drawer open={composing} onClose={() => setComposing(false)} title={t('changelog.new_post')} width={520}>
        {composing && (
          <PostForm
            post={null}
            onDone={() => {
              setComposing(false)
              void mutate()
              void globalMutate('/admin/changelog') // the sidebar badge's copy of page one
            }}
          />
        )}
      </Drawer>
    </div>
  )
}
