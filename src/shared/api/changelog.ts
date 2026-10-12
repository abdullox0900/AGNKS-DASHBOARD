import { http } from './http'

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  return (await promise).data.data
}

/** A row in the list: no text, no picture. */
export interface ChangelogListItem {
  id: string
  title: string
  version: string | null
  authorId: string
  authorName: string | null
  createdAt: string
}

/** One whole post. */
export interface ChangelogPost {
  id: string
  title: string
  body: string
  version: string | null
  linkUrl: string | null
  linkLabel: string | null
  /** small data URL, or null */
  image: string | null
  authorId: string
  authorName: string | null
  createdAt: string
  updatedAt: string
}

export interface ChangelogPage {
  items: ChangelogListItem[]
  nextCursor: string | null
}

export interface ChangelogInput {
  title: string
  body: string
  version: string | null
  linkUrl: string | null
  linkLabel: string | null
  image: string | null
}

export const apiChangelogList = (cursor?: string): Promise<ChangelogPage> => unwrap(http.get('/admin/changelog', { params: { cursor } }))
export const apiChangelogGet = (id: string): Promise<ChangelogPost> => unwrap(http.get(`/admin/changelog/${id}`))
export const apiChangelogCreate = (dto: ChangelogInput) => unwrap<{ id: string }>(http.post('/admin/changelog', dto))
export const apiChangelogUpdate = (id: string, dto: Partial<ChangelogInput>) => unwrap<{ id: string }>(http.patch(`/admin/changelog/${id}`, dto))
export const apiChangelogRemove = (id: string) => unwrap<{ id: string }>(http.delete(`/admin/changelog/${id}`))
