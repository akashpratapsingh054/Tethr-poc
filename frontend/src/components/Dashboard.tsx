import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Link2, LogOut } from 'lucide-react'
import { exchangeDriveCode, getDriveAuthUrl, getDriveStatus, listEntries } from '../lib/api.ts'
import { supabase } from '../lib/supabase.ts'
import type { Entry } from '../types.ts'
import { NoteCard } from './NoteCard.tsx'
import { SnapshotCard } from './SnapshotCard.tsx'
import { Timeline } from './Timeline.tsx'

type DashboardProps = {
  user: User
}

export function Dashboard({ user }: DashboardProps) {
  const [connected, setConnected] = useState(false)
  const [linking, setLinking] = useState(false)
  const [banner, setBanner] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [feedError, setFeedError] = useState('')

  const refreshEntries = useCallback(async () => {
    setFeedError('')
    try {
      const next = await listEntries(user.id)
      setEntries(next)
    } catch (caught) {
      setFeedError(caught instanceof Error ? caught.message : 'Could not load memories')
    } finally {
      setLoadingEntries(false)
    }
  }, [user.id])

  useEffect(() => {
    let active = true
    getDriveStatus(user.id)
      .then((isConnected) => {
        if (active) setConnected(isConnected)
      })
      .catch((caught: unknown) => {
        if (active) setBanner(caught instanceof Error ? caught.message : 'Could not check Drive')
      })
    return () => {
      active = false
    }
  }, [user.id])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) return

    let active = true
    setLinking(true)
    setBanner('')
    exchangeDriveCode(code, user.id)
      .then(() => {
        if (active) setConnected(true)
      })
      .catch((caught: unknown) => {
        if (active) {
          setBanner(caught instanceof Error ? caught.message : 'Could not link Google Drive')
        }
      })
      .finally(() => {
        if (!active) return
        setLinking(false)
        window.history.replaceState({}, '', window.location.pathname)
      })

    return () => {
      active = false
    }
  }, [user.id])

  useEffect(() => {
    void refreshEntries()
  }, [refreshEntries])

  async function linkDrive() {
    setLinking(true)
    setBanner('')
    try {
      const { url } = await getDriveAuthUrl()
      window.location.assign(url)
    } catch (caught) {
      setBanner(caught instanceof Error ? caught.message : 'Could not start Google sign-in')
      setLinking(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8">
      <header className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Tethr</h1>
          <p className="text-sm text-muted">Moments kept for two.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="max-w-56 truncate text-sm text-muted">{user.email}</span>
          {connected ? (
            <span className="inline-flex items-center rounded-full bg-moss-soft px-3 py-1.5 text-sm font-medium text-moss">
              Drive Linked
            </span>
          ) : (
            <button
              className="inline-flex items-center gap-2 rounded-full bg-clay px-4 py-2 text-sm font-medium text-paper hover:bg-clay-deep"
              type="button"
              onClick={() => {
                void linkDrive()
              }}
              disabled={linking}
            >
              <Link2 size={16} />
              {linking ? 'Linking…' : 'Link Memory Drive'}
            </button>
          )}
          <button
            className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm"
            type="button"
            onClick={() => {
              void supabase.auth.signOut()
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      {banner ? <p className="mt-5 text-sm text-clay-deep">{banner}</p> : null}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <SnapshotCard userId={user.id} onSaved={refreshEntries} />
        <NoteCard userId={user.id} onSaved={refreshEntries} />
      </div>

            <Timeline
        userId={user.id}
        userEmail={user.email || 'Partner'}
        entries={entries}
        loading={loadingEntries}
        error={feedError}
        onCommentAdded={refreshEntries}
      />

    </div>
  )
}
