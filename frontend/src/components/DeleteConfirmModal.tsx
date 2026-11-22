import { Trash2, X } from 'lucide-react'

type DeleteConfirmModalProps = {
  headerLabel: string
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({
  headerLabel,
  deleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-xs"
      onClick={deleting ? undefined : onCancel}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-line bg-paper p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blush text-clay-deep">
            <Trash2 className="h-5 w-5" />
          </div>
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-cream text-muted transition hover:text-ink disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mt-4 font-serif text-2xl text-ink">
          Do you want to delete &ldquo;{headerLabel}&rdquo;?
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          This will permanently remove this memory, its replies, and the backup file from your Google Drive.
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="rounded-full border border-line bg-cream px-5 py-2 text-sm font-medium text-ink transition hover:bg-line/40 disabled:opacity-40"
          >
            No
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="rounded-full bg-clay-deep px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink disabled:opacity-40"
          >
            {deleting ? 'Deleting…' : 'Yes'}
          </button>
        </div>
      </div>
    </div>
  )
}
