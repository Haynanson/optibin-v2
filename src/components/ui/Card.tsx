interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export default function Card({ title, children, className = '', style }: CardProps) {
  return (
    <div className={`card ${className}`} style={style}>
      {title && (
        <p className="card-title">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
