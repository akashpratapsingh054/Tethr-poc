import type { Entry } from '../types.ts'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const codeExchanges = new Map<string, Promise<void>>()

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init)
  const payload = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`)
  }
  return payload as T
}

export function getDriveAuthUrl() {
  return request<{ url: string }>('/api/auth/google-drive/url')
}

export function exchangeDriveCode(code: string, userId: string) {
  const existing = codeExchanges.get(code)
  if (existing) return existing

  const pending = request<{ connected: boolean }>('/api/auth/google-drive/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, user_id: userId }),
  }).then(() => undefined)

  codeExchanges.set(code, pending)
  pending.catch(() => {
    codeExchanges.delete(code)
  })
  return pending
}

export async function getDriveStatus(userId: string) {
  const result = await request<{ connected: boolean }>(
    `/api/auth/google-drive/status?user_id=${encodeURIComponent(userId)}`,
  )
  return result.connected
}

export function saveTextEntry(input: { user_id: string; title: string; text_content: string }) {
  return request<Entry>('/api/entries/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function saveImageEntry(form: FormData) {
  return request<Entry>('/api/entries/image', {
    method: 'POST',
    body: form,
  })
}

export function listEntries(userId: string) {
  return request<Entry[]>(`/api/entries?user_id=${encodeURIComponent(userId)}`)
}
