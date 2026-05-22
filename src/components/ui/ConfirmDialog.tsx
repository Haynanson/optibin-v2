interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!message) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className="card max-w-sm"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
      >
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text)' }}>
          {message}
        </p>
        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onCancel}
            className="btn btn-outline"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
