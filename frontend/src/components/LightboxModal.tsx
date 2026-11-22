import { Download, X } from 'lucide-react'
import type { Entry } from '../types.ts'

type LightboxModalProps = {
  entry: Entry
  src: string
  formattedDate: string
  onClose: () => void
}

export function LightboxModal({ entry, src, formattedDate, onClose }: LightboxModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] max-w-4xl flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="text-xs tracking-[0.14em] text-muted uppercase">{formattedDate}</p>
          <div className="flex items-center gap-2">
            <a
              href={src}
              download={entry.drive_file_name || 'tethr-memory.jpg'}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-line/40"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-cream text-ink transition hover:bg-line/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-ink/5 p-3">
          <img
            src={src}
            alt={entry.caption || 'Full snapshot'}
            className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
          />
        </div>

        {entry.caption ? (
          <div className="border-t border-line bg-paper px-6 py-3.5">
            <p className="text-sm leading-6 text-ink">{entry.caption}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
