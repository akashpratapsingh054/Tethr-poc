import { useState } from 'react'
import { Download, Maximize2, MessageCircle, Send } from 'lucide-react'
import { API_URL } from '../lib/api.ts'
import type { Entry } from '../types.ts'
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

function shortAuthor(email: string) {
  const parts = email.split('@')
  return parts || email
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
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const expandedSrc =
    expandedEntry?.drive_file_id
      ? `${API_URL}/api/media/image/${expandedEntry.drive_file_id}?user_id=${expandedEntry.user_id || userId}`
      : null

  async function submitComment(entryId: string) {
    const text = (drafts[entryId] || '').trim()
    if (!text) return

    setSubmittingId(entryId)
    try {
      const response = await fetch(`${API_URL}/api/entries/${entryId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          author_email: userEmail,
          comment_text: text,
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Could not post comment')
      }
      setDrafts((prev) => ({ ...prev, [entryId]: '' }))
      await onCommentAdded()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to post reply')
    } finally {
      setSubmittingId(null)
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
          const comments = entry.comments ?? []

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
                  {entry.entry_type === 'image' && imgSrc ? (
                    <button
                      type="button"
                      onClick={() => setExpandedEntry(entry)}
                      className="text-xs font-medium text-clay-deep underline-offset-2 hover:underline"
                    >
                      Expand
                    </button>
                  ) : null}
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

                <div className="mt-3 border-t border-line/80 pt-3">
                  {comments.length > 0 ? (
                    <ul className="mb-2.5 space-y-1.5">
                      {comments.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-2xl bg-cream/80 px-3 py-2 text-xs leading-5 text-ink"
                        >
                          <span className="font-semibold text-clay-deep">
                            {c.user_id === userId ? 'You' : shortAuthor(c.author_email)}:{' '}
                          </span>
                          <span>{c.comment_text}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mb-2 flex items-center gap-1 text-[11px] text-muted">
                      <MessageCircle className="h-3 w-3" /> Start a note on this memory…
                    </p>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      void submitComment(entry.id)
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      value={drafts[entry.id] || ''}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))
                      }
                      placeholder="Write a reply…"
                      className="min-w-0 flex-1 rounded-full border border-line bg-cream/60 px-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-clay focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submittingId === entry.id || !(drafts[entry.id] || '').trim()}
                      title="Send reply"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay text-paper transition hover:bg-clay-deep disabled:opacity-40"
                    >
                      <Send className="h-3 w-3" />
                    </button>
                  </form>
                </div>
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
    </section>
  )
}
