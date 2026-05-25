import { Link } from 'react-router-dom'

function Button({ children, to, type = 'button', variant = 'primary', onClick }) {
  const className =
    variant === 'secondary' ? 'button button-secondary' : 'button button-primary'

  if (to) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={className} onClick={onClick}>
      {children}
    </button>
  )
}

export default Button
