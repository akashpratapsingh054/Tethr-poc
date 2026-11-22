import { useState } from 'react'
import { Download, Maximize2, Trash2 } from 'lucide-react'
import { API_URL } from '../lib/api.ts'
import type { Entry } from '../types.ts'
import { CommentSection } from './CommentSection.tsx'
import { DeleteConfirmModal } from './DeleteConfirmModal.tsx'
import { LightboxModal } from './LightboxModal.tsx'

type TimelineProps = {
  userId: string
  userEmail: string
  entries: Entry[]
  loading: boolean
  error: string
  onCommentAdded: () => Promise<void> | void
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatKb(value: Entry['original_size_kb']) {
  if (value === null || value === '') return null
  const amount = Number(value)
  if (!Number.isFinite(amount)) return null
  return `${amount.toFixed(1)} KB`
}

function getEntryHeader(entry: Entry) {
  if (entry.entry_type === 'text') {
    return entry.title?.trim() || 'Untitled note'
  }
  const caption = entry.caption?.trim()
  if (!caption) return 'Untitled snapshot'
  return caption.length > 48 ? `${caption.slice(0, 48)}…` : caption
}

function MemoryImage({
  src,
  alt,
  fileName,
  onExpand,
}: {
  src: string
  alt: string
  fileName: string
  onExpand: () => void
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex min-h-[180px] items-center justify-center bg-cream px-6 text-center text-sm text-muted">
        This photo could not be loaded from Drive.
      </div>
    )
  }

  return (
    <div className="group relative bg-cream/60">
      <img
        className="block h-auto max-h-[540px] w-full cursor-zoom-in object-contain transition duration-300 group-hover:brightness-[0.97]"
        src={src}
        alt={alt}
        loading="lazy"
        onClick={onExpand}
        onError={() => setFailed(true)}
      />

      <div className="absolute top-3 right-3 flex gap-1.5 opacity-90 transition sm:opacity-0 sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={onExpand}
          title="Expand full image"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm backdrop-blur-sm transition hover:bg-paper"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <a
          href={src}
          download={fileName}
          title="Download image"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm backdrop-blur-sm transition hover:bg-paper"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}

export function Timeline({
  userId,
  userEmail,
  entries,
  loading,
  error,
  onCommentAdded,
}: TimelineProps) {
  const [expandedEntry, setExpandedEntry] = useState<Entry | null>(null)
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<Entry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const expandedSrc =
    expandedEntry?.drive_file_id
      ? `${API_URL}/api/media/image/${expandedEntry.drive_file_id}?user_id=${expandedEntry.user_id || userId}`
      : null

  async function confirmDelete() {
    if (!confirmDeleteEntry) return

    setDeleting(true)
    try {
      const response = await fetch(
        `${API_URL}/api/entries/${confirmDeleteEntry.id}?user_id=${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Could not delete memory')
      }
      if (expandedEntry?.id === confirmDeleteEntry.id) {
        setExpandedEntry(null)
      }
      setConfirmDeleteEntry(null)
      await onCommentAdded()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete memory')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl">Our Timeline</h2>
          <p className="mt-1 text-sm text-muted">Newest memories first.</p>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-clay-deep">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-muted">Gathering memories…</p> : null}

      {!loading && !error && entries.length === 0 ? (
        <p className="mt-6 rounded-[28px] border border-dashed border-line bg-paper/70 px-6 py-10 text-center text-muted">
          No memories yet. Save a snapshot or write a note.
        </p>
      ) : null}

      <div className="mt-6 columns-1 gap-5 space-y-5 sm:columns-2 lg:columns-3">
        {entries.map((entry) => {
          const original = formatKb(entry.original_size_kb)
          const compressed = formatKb(entry.compressed_size_kb)
          const imgSrc = entry.drive_file_id
            ? `${API_URL}/api/media/image/${entry.drive_file_id}?user_id=${entry.user_id || userId}`
            : ''
          const fileName = entry.drive_file_name || `tethr-${entry.id.slice(0, 8)}.jpg`
          const isCreator = entry.user_id === userId

          return (
            <article
              key={entry.id}
              className="break-inside-avoid overflow-hidden rounded-[26px] border border-line bg-paper shadow-xs transition hover:shadow-sm"
            >
              {entry.entry_type === 'image' && entry.drive_file_id ? (
                <MemoryImage
                  src={imgSrc}
                  alt={entry.caption || 'Saved snapshot'}
                  fileName={fileName}
                  onExpand={() => setExpandedEntry(entry)}
                />
              ) : null}

              <div className="space-y-2 px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] tracking-[0.16em] text-muted uppercase">
                    {entry.entry_type === 'image' ? 'Snapshot' : 'Note'} · {formatWhen(entry.created_at)}
                  </p>
                  <div className="flex items-center gap-2.5">
                    {entry.entry_type === 'image' && imgSrc ? (
                      <button
                        type="button"
                        onClick={() => setExpandedEntry(entry)}
                        className="text-xs font-medium text-clay-deep underline-offset-2 hover:underline"
                      >
                        Expand
                      </button>
                    ) : null}

                    {isCreator ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteEntry(entry)}
                        title="Delete post"
                        className="text-muted transition hover:text-clay-deep"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {entry.entry_type === 'text' ? (
                  <>
                    <h3 className="font-serif text-2xl">{entry.title}</h3>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-ink/90">{entry.text_content}</p>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-6">{entry.caption || 'Untitled snapshot'}</p>
                )}

                {original && compressed ? (
                  <p className="pt-1 text-xs text-muted">
                    {original} original · {compressed} compressed
                  </p>
                ) : null}

                <CommentSection
                  entryId={entry.id}
                  userId={userId}
                  userEmail={userEmail}
                  comments={entry.comments ?? []}
                  onCommentAdded={onCommentAdded}
                />
              </div>
            </article>
          )
        })}
      </div>

      {expandedEntry && expandedSrc ? (
        <LightboxModal
          entry={expandedEntry}
          src={expandedSrc}
          formattedDate={formatWhen(expandedEntry.created_at)}
          onClose={() => setExpandedEntry(null)}
        />
      ) : null}

      {confirmDeleteEntry ? (
        <DeleteConfirmModal
          headerLabel={getEntryHeader(confirmDeleteEntry)}
          deleting={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setConfirmDeleteEntry(null)}
        />
      ) : null}
    </section>
  )
}
