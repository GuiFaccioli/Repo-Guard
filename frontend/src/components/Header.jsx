function Header() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-brand">
          <img
            src="/favicon.png"
            alt=""
            aria-hidden="true"
            className="site-header-logo"
          />
          <p className="site-header-title">Repo-Guard</p>
        </div>

        <a
          className="site-header-star"
          href="https://github.com/GuiFaccioli/Repo-Guard"
          target="_blank"
          rel="noopener noreferrer"
        >
          {'\u2606'} Star this project
        </a>
      </div>
    </header>
  )
}

export default Header
