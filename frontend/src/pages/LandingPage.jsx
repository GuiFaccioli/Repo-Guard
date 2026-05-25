import Button from '../components/Button'
import Card from '../components/Card'

const checks = [
  'README',
  'Dependabot',
  'GitHub Actions',
  'License',
  'Last activity',
  'Open issues / PRs',
]

function LandingPage() {
  const apiBaseUrl = import.meta.env.VITE_API_URL?.trim()
  const oauthStartUrl = apiBaseUrl
    ? `${apiBaseUrl.replace(/\/$/, '')}/auth/github/start`
    : null

  return (
    <div className="page onboarding-page">
      <Card className="connect-card">
        <p className="eyebrow">GitHub-first onboarding</p>
        <h1>Connect GitHub to start repository health analysis</h1>
        <p className="page-description">
          RepoGuard analyzes repositories for security, quality, and maintenance
          signals, then organizes results into a clear health score and prioritized
          recommendations.
        </p>

        <div className="connect-panel">
          <div className="github-mark" aria-hidden="true">
            GH
          </div>
          <div>
            <p className="identity-name">GitHub connection required</p>
            <p className="identity-meta">
              Authentication flow is a placeholder in this stage. No real OAuth is
              executed yet.
            </p>
          </div>
        </div>

        <div className="hero-actions">
          {oauthStartUrl ? (
            <Button href={oauthStartUrl}>Continue with GitHub</Button>
          ) : (
            <Button disabled>
              Continue with GitHub (set VITE_API_URL)
            </Button>
          )}
          <Button to="/repositories" variant="secondary">
            Preview dashboard
          </Button>
        </div>

        <ul className="trust-notes">
          <li>GitHub tokens will never be exposed to the frontend.</li>
          <li>Repository analysis starts after authentication.</li>
        </ul>
      </Card>

      <Card title="Planned checks preview" subtitle="Initial repository signals">
        <div className="checks-row">
          {checks.map((check) => (
            <span className="check-chip" key={check}>
              {check}
            </span>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default LandingPage
