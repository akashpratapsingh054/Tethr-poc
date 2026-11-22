import { useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { API_URL } from '../lib/api.ts'
import type { EntryComment } from '../types.ts'

type CommentSectionProps = {
  entryId: string
  userId: string
  userEmail: string
  comments: EntryComment[]
  onCommentAdded: () => Promise<void> | void
}

function shortAuthor(email: string) {
  const parts = email.split('@')
  return parts || email
}

export function CommentSection({
  entryId,
  userId,
  userEmail,
  comments,
  onCommentAdded,
}: CommentSectionProps) {
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return

    setSubmitting(true)
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
      setDraft('')
      await onCommentAdded()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }

  return (
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

      <form onSubmit={(e) => void handleSubmit(e)} className="flex items-center gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a reply…"
          className="min-w-0 flex-1 rounded-full border border-line bg-cream/60 px-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-clay focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !draft.trim()}
          title="Send reply"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay text-paper transition hover:bg-clay-deep disabled:opacity-40"
        >
          <Send className="h-3 w-3" />
        </button>
      </form>
    </div>
  )
}
