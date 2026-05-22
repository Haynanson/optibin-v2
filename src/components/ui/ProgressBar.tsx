interface ProgressBarProps {
  value: number
  color?: string
  height?: number
}

export default function ProgressBar({ value, color = 'var(--primary)', height = 4 }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className="progress">
      <div
        className="progress-track"
        style={{ height }}
      >
        <div
          className="progress-fill"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
      <span className="progress-label">
        {Math.round(clamped)}%
      </span>
    </div>
  )
}
