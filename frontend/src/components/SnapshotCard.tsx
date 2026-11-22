import { useState, type FormEvent } from 'react'
import imageCompression from 'browser-image-compression'
import { ImagePlus } from 'lucide-react'
import { saveImageEntry } from '../lib/api.ts'

type SnapshotCardProps = {
  userId: string
  onSaved: () => Promise<void>
}

function kilobytes(bytes: number) {
  return Math.round((bytes / 1024) * 10) / 10
}

export function SnapshotCard({ userId, onSaved }: SnapshotCardProps) {
  const [caption, setCaption] = useState('')
  const [originalKb, setOriginalKb] = useState<number | null>(null)
  const [compressedKb, setCompressedKb] = useState<number | null>(null)
  const [compressedFile, setCompressedFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onFile(file: File | undefined) {
    setError('')
    setStatus('')
    setCompressedFile(null)
    setOriginalKb(null)
    setCompressedKb(null)
    if (!file) return

    setPending(true)
    setStatus('Compressing…')
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      })
      setOriginalKb(kilobytes(file.size))
      setCompressedKb(kilobytes(compressed.size))
      setCompressedFile(compressed)
      setStatus('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not compress that photo')
    } finally {
      setPending(false)
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!compressedFile || originalKb === null || compressedKb === null) {
      setError('Choose a photo first')
      return
    }

    setPending(true)
    setError('')
    try {
      const form = new FormData()
      form.append('image', compressedFile, compressedFile.name || 'snapshot.jpg')
      form.append('caption', caption)
      form.append('user_id', userId)
      form.append('original_size_kb', String(originalKb))
      form.append('compressed_size_kb', String(compressedKb))
      await saveImageEntry(form)
      setCaption('')
      setCompressedFile(null)
      setOriginalKb(null)
      setCompressedKb(null)
      setStatus('Snapshot saved.')
      await onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the snapshot')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-[28px] border border-line bg-paper p-6 shadow-[0_16px_40px_rgb(80_48_28_/_6%)]">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-blush text-clay">
          <ImagePlus size={18} />
        </span>
        <h2 className="font-serif text-2xl">Save a Snapshot</h2>
      </div>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium">
          Photo
          <input
            className="mt-1.5 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-blush file:px-4 file:py-2 file:font-medium file:text-clay"
            type="file"
            accept="image/*"
            onChange={(event) => {
              void onFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>

        {originalKb !== null && compressedKb !== null ? (
          <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-muted">
            Original {originalKb.toFixed(1)} KB
            <span className="px-2 text-line">/</span>
            Compressed {compressedKb.toFixed(1)} KB
          </p>
        ) : null}

        <label className="block text-sm font-medium">
          The Story Behind It
          <textarea
            className="mt-1.5 min-h-28 w-full resize-y rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-clay"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="What should the two of you remember?"
          />
        </label>

        {status ? <p className="text-sm text-moss">{status}</p> : null}
        {error ? <p className="text-sm text-clay-deep">{error}</p> : null}

        <button
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper"
          type="submit"
          disabled={pending}
        >
          {pending ? 'Working…' : 'Save snapshot'}
        </button>
      </form>
    </section>
  )
}
