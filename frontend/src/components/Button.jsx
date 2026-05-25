import { Link } from 'react-router-dom'

function Button({
  children,
  to,
  href,
  type = 'button',
  variant = 'primary',
  onClick,
  className = '',
  disabled = false,
}) {
  const buttonClass =
    variant === 'secondary' ? 'button button-secondary' : 'button button-primary'
  const mergedClassName = `${buttonClass} ${className} ${disabled ? 'button-disabled' : ''}`.trim()

  if (href && !disabled) {
    return (
      <a href={href} className={mergedClassName}>
        {children}
      </a>
    )
  }

  if (to && !disabled) {
    return (
      <Link to={to} className={mergedClassName}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={mergedClassName} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export default Button
