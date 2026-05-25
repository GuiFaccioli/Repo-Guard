function Card({ title, subtitle, children }) {
  return (
    <article className="card">
      {title ? <h3 className="card-title">{title}</h3> : null}
      {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
      {children}
    </article>
  )
}

export default Card
