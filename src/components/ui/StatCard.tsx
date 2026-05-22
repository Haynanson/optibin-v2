interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  sub?: string
  color?: string
}

export default function StatCard({
  label,
  value,
  unit = '',
  sub = '',
  color = 'var(--primary)',
}: StatCardProps) {
  return (
    <div className="stat-card">
      <p className="stat-label">
        {label}
      </p>
      <div className="flex items-baseline gap-1 mt-1.5 mb-1">
        <span className="stat-value" style={{ color }}>
          {value}
        </span>
        {unit && (
          <span className="stat-unit">
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <p className="stat-sub">
          {sub}
        </p>
      )}
    </div>
  )
}
