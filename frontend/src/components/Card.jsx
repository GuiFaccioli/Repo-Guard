function Card({ title, subtitle, children, className = '' }) {
  return (
    <article className={`card ${className}`.trim()}>
      {title ? <h3 className="card-title">{title}</h3> : null}
      {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
      {children}
    </article>
  )
}

export default Card
