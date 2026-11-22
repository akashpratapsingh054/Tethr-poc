import { useState, type FormEvent } from 'react'
import { PenLine } from 'lucide-react'
import { saveTextEntry } from '../lib/api.ts'

type NoteCardProps = {
  userId: string
  onSaved: () => Promise<void>
}

export function NoteCard({ userId, onSaved }: NoteCardProps) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setNotice('')
    try {
      await saveTextEntry({
        user_id: userId,
        title: title.trim(),
        text_content: text.trim(),
      })
      setTitle('')
      setText('')
      setNotice('Note saved to your timeline and Drive.')
      await onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the note')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-[28px] border border-line bg-paper p-6 shadow-[0_16px_40px_rgb(80_48_28_/_6%)]">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-blush text-clay">
          <PenLine size={18} />
        </span>
        <h2 className="font-serif text-2xl">Write a Note</h2>
      </div>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium">
          Title
          <input
            className="mt-1.5 w-full rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-clay"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder="A letter, a promise, a small thing"
          />
        </label>
        <label className="block text-sm font-medium">
          Note
          <textarea
            className="mt-1.5 min-h-36 w-full resize-y rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-clay"
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
            placeholder="Write it the way you would say it."
          />
        </label>

        {notice ? <p className="text-sm text-moss">{notice}</p> : null}
        {error ? <p className="text-sm text-clay-deep">{error}</p> : null}

        <button
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper"
          type="submit"
          disabled={pending}
        >
          {pending ? 'Saving…' : 'Save note'}
        </button>
      </form>
    </section>
  )
}
