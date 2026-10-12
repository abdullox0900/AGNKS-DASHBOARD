import { useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import { Camera, KeyRound, Trash2 } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Avatar } from '@/shared/ui/Avatar'
import { Drawer } from '@/shared/ui/Drawer'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useToast } from '@/shared/ui/Toast'
import { ChangePasswordForm } from '@/features/profile/ChangePasswordForm'
import { useMyActivity, useProfile } from '@/shared/api/hooks'
import { apiUpdateProfile } from '@/shared/api/client'
import { useAuthStore } from '@/shared/config/authStore'
import { fileToAvatarDataUrl } from '@/shared/lib/image'
import { formatDateTime, formatDateShort } from '@/shared/lib/dates'
import { formatPhone } from '@/shared/lib/phone'
import { ACTIONS } from '@/pages/audit/AuditPage'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const ROLE_LABEL: Record<string, DictKey> = { root_admin: 'role.root_admin', branch_manager: 'role.branch_manager', seo: 'role.seo' }
const BIO_MAX = 300

const fieldClass =
  'h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60'

/** Own profile: picture, name, "about me", account facts, password and recent actions. Open to every dashboard role. */
export function ProfilePage() {
  const { t } = useI18n()
  const { show } = useToast()
  const { mutate: globalMutate } = useSWRConfig()
  const setFirstName = useAuthStore((s) => s.setFirstName)
  const { data: profile, mutate, isLoading } = useProfile()
  const { data: activity } = useMyActivity()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState<string | null>(null)
  const [bio, setBio] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  if (isLoading || !profile) {
    return (
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </div>
    )
  }

  const shownName = name ?? profile.firstName
  const shownBio = bio ?? profile.bio ?? ''
  const dirty = shownName.trim() !== profile.firstName || shownBio.trim() !== (profile.bio ?? '')
  const valid = shownName.trim().length >= 2 && shownBio.length <= BIO_MAX

  async function apply(patch: Parameters<typeof apiUpdateProfile>[0]) {
    const updated = await apiUpdateProfile(patch)
    await mutate(updated, false)
    setFirstName(updated.firstName)
    void globalMutate('/admin/auth/me/activity')
    void globalMutate('/admin/auth/avatars')
    return updated
  }

  async function save() {
    if (!dirty || !valid) return
    setSaving(true)
    try {
      await apply({ firstName: shownName.trim(), bio: shownBio.trim() || null })
      setName(null)
      setBio(null)
      show(t('profile.saved'))
    } catch {
      show(t('common.error_generic'))
    } finally {
      setSaving(false)
    }
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    try {
      await apply({ avatar: await fileToAvatarDataUrl(file) })
      show(t('profile.photo_saved'))
    } catch (err) {
      const code = (err as Error).message
      show(code === 'not_image' ? t('profile.photo_not_image') : code === 'too_big' ? t('profile.photo_too_big') : t('common.error_generic'))
    } finally {
      setPhotoBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removePhoto() {
    setPhotoBusy(true)
    try {
      await apply({ avatar: null })
      show(t('profile.photo_removed'))
    } catch {
      show(t('common.error_generic'))
    } finally {
      setPhotoBusy(false)
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="flex flex-col items-center text-center">
        <Avatar src={profile.avatar} name={profile.firstName} size={112} />
        <p className="mt-4 text-[18px] font-bold text-[var(--color-ink)]">{profile.firstName}</p>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
          <Badge tone="primary">{t(ROLE_LABEL[profile.role])}</Badge>
          {profile.stationName && <Badge>{profile.stationName}</Badge>}
        </div>
        {profile.bio && <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-[var(--color-ink-secondary)]">{profile.bio}</p>}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
        <div className="mt-5 flex w-full gap-2">
          <Button variant="secondary" className="flex-1" loading={photoBusy} onClick={() => fileRef.current?.click()}>
            <Camera size={15} /> {profile.avatar ? t('profile.photo_change') : t('profile.photo_add')}
          </Button>
          {profile.avatar && (
            <Button variant="ghost" aria-label={t('profile.photo_remove')} title={t('profile.photo_remove')} disabled={photoBusy} onClick={() => void removePhoto()}>
              <Trash2 size={15} />
            </Button>
          )}
        </div>
        <p className="mt-2 text-[11.5px] text-[var(--color-ink-tertiary)]">{t('profile.photo_hint')}</p>
      </Card>

      <div className="space-y-4">
        <Card>
          <h3 className="mb-4 text-[14px] font-semibold text-[var(--color-ink)]">{t('profile.about_title')}</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('profile.name')}</label>
                <input value={shownName} maxLength={40} onChange={(e) => setName(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('profile.phone')}</label>
                <input value={profile.phone ? formatPhone(profile.phone) : ''} disabled className={fieldClass} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 flex items-center justify-between text-[13px] font-medium text-[var(--color-ink-secondary)]">
                {t('profile.bio')}
                <span className="tnum text-[11.5px] font-normal text-[var(--color-ink-tertiary)]">
                  {shownBio.length}/{BIO_MAX}
                </span>
              </label>
              <textarea
                value={shownBio}
                maxLength={BIO_MAX}
                rows={4}
                placeholder={t('profile.bio_ph')}
                onChange={(e) => setBio(e.target.value)}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-[14px] leading-relaxed text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-[var(--color-ink-tertiary)]">
                {t('profile.member_since', { date: formatDateShort(profile.createdAt) })}
              </p>
              <Button type="submit" disabled={!dirty || !valid} loading={saving}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{t('profile.security_title')}</h3>
              <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-tertiary)]">{t('profile.security_hint')}</p>
            </div>
            <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
              <KeyRound size={15} /> {t('topbar.change_password')}
            </Button>
          </div>
        </Card>

        <Card padded={false}>
          <div className="border-b border-[var(--color-border)] px-5 py-3.5">
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{t('profile.activity_title')}</h3>
          </div>
          {!activity ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : activity.items.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-[var(--color-ink-tertiary)]">{t('profile.activity_empty')}</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {activity.items.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 px-5 py-2.5 text-[13px]">
                  <span className="text-[var(--color-ink)]">
                    {ACTIONS[a.action] ? t(ACTIONS[a.action].label) : a.action}
                    {a.target && <span className="ml-1.5 text-[var(--color-ink-tertiary)]">· {a.target}</span>}
                  </span>
                  <span className="tnum text-[12px] text-[var(--color-ink-tertiary)]">{formatDateTime(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Drawer open={passwordOpen} onClose={() => setPasswordOpen(false)} title={t('topbar.change_password')}>
        <ChangePasswordForm phone={profile.phone} onDone={() => setPasswordOpen(false)} />
      </Drawer>
    </div>
  )
}
