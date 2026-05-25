import { Link } from 'react-router-dom'

function Button({
  children,
  to,
  type = 'button',
  variant = 'primary',
  onClick,
  className = '',
}) {
  const buttonClass =
    variant === 'secondary' ? 'button button-secondary' : 'button button-primary'
  const mergedClassName = `${buttonClass} ${className}`.trim()

  if (to) {
    return (
      <Link to={to} className={mergedClassName}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={mergedClassName} onClick={onClick}>
      {children}
    </button>
  )
}

export default Button
