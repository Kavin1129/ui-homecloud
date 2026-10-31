export type UserResponse = {
  id: string
  username: string
  email: string
}

export type EntityId = string | number

export type FolderResponse = {
  id: EntityId
  name: string
  parentFolderId: EntityId | null
  updatedAt: string
}

export type FileResponse = {
  id: number
  filename: string
  ownerId: number
  sizeBytes: number | null
  updatedAt: string
}

export type StorageResponse = {
  usedBytes: number
  limitBytes: number
  availableBytes: number
  usedPercentage: number
}

type SessionUser = Pick<UserResponse, 'username'> & Partial<Pick<UserResponse, 'id' | 'email'>>
type RequestOptions = RequestInit & { authenticated?: boolean }

declare global {
  interface Window {
    __HOME_CLOUD_CONFIG__?: { apiBaseUrl?: string }
  }
}

const API_BASE_URL = (
  window.__HOME_CLOUD_CONFIG__?.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
).replace(/\/+$/, '')
const TOKEN_KEY = 'homecloud.auth.token'
const USER_KEY = 'homecloud.auth.user'
let storageRequest: Promise<StorageResponse> | null = null

function readSessionUser(): SessionUser | null {
  const stored = sessionStorage.getItem(USER_KEY)
  if (!stored) return null
  try { return JSON.parse(stored) as SessionUser }
  catch { sessionStorage.removeItem(USER_KEY); return null }
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { authenticated = true, headers: suppliedHeaders, ...init } = options
  const headers = new Headers(suppliedHeaders)
  if (authenticated) {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try { response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers }) }
  catch { throw new Error(`Could not reach HomeCloud at ${API_BASE_URL}. Check that the backend is running.`) }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    try {
      const body: unknown = await response.json()
      if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>
        const candidate = record.message ?? record.error ?? record.detail
        if (typeof candidate === 'string' && candidate.trim()) message = candidate
      }
    } catch { /* Keep the status-based message when the response is not JSON. */ }
    if (response.status === 401) {
      clearSession()
      window.dispatchEvent(new Event('homecloud:session-expired'))
    }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  if (response.headers.get('content-type')?.includes('application/json')) return response.json() as Promise<T>
  return response.blob() as Promise<T>
}

function jsonBody(value: unknown) { return JSON.stringify(value) }
function withQuery(path: string, key: string, value: EntityId | null) {
  if (value === null) return path
  const query = new URLSearchParams({ [key]: String(value) })
  return `${path}?${query.toString()}`
}

export const api = {
  getCurrentUser(): SessionUser | null {
    return sessionStorage.getItem(TOKEN_KEY) ? readSessionUser() : null
  },
  setSessionUser(user: SessionUser) { sessionStorage.setItem(USER_KEY, JSON.stringify(user)) },
  async register(input: { username: string; email: string; password: string }) {
    return request<UserResponse>('/users', { method: 'POST', body: jsonBody(input), authenticated: false })
  },
  async login(input: { username: string; password: string }) {
    const result = await request<{ token?: unknown }>('/auth/login', { method: 'POST', body: jsonBody(input), authenticated: false })
    if (typeof result.token !== 'string' || !result.token.trim()) throw new Error('The login response did not include a valid token.')
    sessionStorage.setItem(TOKEN_KEY, result.token)
    sessionStorage.setItem(USER_KEY, JSON.stringify({ username: input.username }))
    return { token: result.token }
  },
  async logout() {
    try { await request<void>('/auth/logout', { method: 'POST' }) }
    finally { clearSession() }
  },
  getStorage() {
    if (!storageRequest) {
      storageRequest = request<StorageResponse>('/storage').finally(() => { storageRequest = null })
    }
    return storageRequest
  },
  listFolders(parentFolderId: EntityId | null) {
    return request<FolderResponse[]>(withQuery('/folders', 'parentFolderId', parentFolderId))
  },
  createFolder(input: { name: string; parentFolderId: EntityId | null }) {
    return request<FolderResponse>('/folders', { method: 'POST', body: jsonBody(input) })
  },
  renameFolder(id: EntityId, name: string) {
    return request<FolderResponse>(`/folders/${encodeURIComponent(id)}`, { method: 'PUT', body: jsonBody({ name }) })
  },
  moveFolder(id: EntityId, targetFolderId: EntityId | null) {
    return request<FolderResponse>(`/folders/${encodeURIComponent(id)}/move`, { method: 'PUT', body: jsonBody({ targetFolderId }) })
  },
  trashFolder(id: EntityId) {
    return request<void>(`/folders/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  restoreFolder(id: EntityId) {
    return request<FolderResponse>(`/folders/${encodeURIComponent(id)}/restore`, { method: 'POST' })
  },
  permanentlyDeleteFolder(id: EntityId) {
    return request<void>(`/folders/${encodeURIComponent(id)}/permanent`, { method: 'DELETE' })
  },
  listFiles(folderId: EntityId | null) {
    return request<FileResponse[]>(withQuery('/files', 'folderId', folderId))
  },
  listTrashedFiles() {
    return request<FileResponse[]>('/files/trash')
  },
  listTrashedFolders() {
    return request<FolderResponse[]>('/folders/trash')
  },
  getFile(id: number) {
    return request<FileResponse>(`/files/${encodeURIComponent(id)}`)
  },
  uploadFile(file: File, folderId: EntityId | null) {
    const body = new FormData()
    body.append('file', file)
    if (folderId !== null) body.append('folderId', String(folderId))
    return request<FileResponse>('/files', { method: 'POST', body })
  },
  async downloadFile(id: number, filename: string) {
    const blob = await request<Blob>(`/files/${encodeURIComponent(id)}/download`)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  },
  renameFile(id: number, filename: string) {
    return request<FileResponse>(`/files/${encodeURIComponent(id)}`, { method: 'PUT', body: jsonBody({ filename }) })
  },
  moveFile(id: number, targetFolderId: EntityId | null) {
    const path = withQuery(`/files/${encodeURIComponent(id)}/move`, 'targetFolderId', targetFolderId)
    return request<FileResponse>(path, { method: 'PUT' })
  },
  trashFile(id: number) {
    return request<void>(`/files/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  restoreFile(id: number) {
    return request<FileResponse>(`/files/trash/${encodeURIComponent(id)}/restore`, { method: 'POST' })
  },
  permanentlyDeleteFile(id: number) {
    return request<void>(`/files/trash/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}

export const apiBaseUrl = API_BASE_URL
