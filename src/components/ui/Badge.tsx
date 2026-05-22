
const STATUS_LABELS: Record<string, string> = {
  critical: '紧急优化',
  warning: '需关注',
  normal: '正常',
  good: '优良',
  active: '进行中',
  negotiating: '洽谈中',
  complete: '已完结',
  prospect: '意向方',
}

interface BadgeProps {
  status: string
  children?: React.ReactNode
}

export default function Badge({ status, children }: BadgeProps) {
  const label = STATUS_LABELS[status] || STATUS_LABELS.normal
  return (
    <span className={`badge badge-${status}`}>
      {children || label}
    </span>
  )
}
