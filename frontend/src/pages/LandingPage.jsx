import Button from '../components/Button'
import Card from '../components/Card'
import { buildBackendUrl, normalizeApiBaseUrl } from '../utils/apiUrl'

const checks = [
  'README',
  'Dependabot',
  'GitHub Actions',
  'License',
  'Last activity',
  'Open issues / PRs',
]

function LandingPage() {
  const rawApiBaseUrl = import.meta.env.VITE_API_URL
  const apiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl)
  const oauthStartUrl = buildBackendUrl(rawApiBaseUrl, '/auth/github/start')

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
              RepoGuard starts GitHub OAuth through the configured backend API.
            </p>
          </div>
        </div>

        <div className="hero-actions">
          {oauthStartUrl && apiBaseUrl ? (
            <Button href={oauthStartUrl}>Continue with GitHub</Button>
          ) : (
            <Button disabled>Continue with GitHub</Button>
          )}
          <Button to="/repositories" variant="secondary">
            Preview dashboard
          </Button>
        </div>
        {!oauthStartUrl || !apiBaseUrl ? (
          <p className="state-note state-note-danger">
            Backend API URL is not configured for this environment.
          </p>
        ) : null}

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
