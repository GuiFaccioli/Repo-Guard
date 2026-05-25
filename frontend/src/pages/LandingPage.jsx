import Button from '../components/Button'
import Card from '../components/Card'

const checks = [
  'Repository health score',
  'Security checks',
  'Quality checks',
  'Maintenance checks',
  'Actionable recommendations',
  'Scan history tracking',
]

function LandingPage() {
  return (
    <div className="page page-landing">
      <section className="hero-section onboarding-hero">
        <p className="eyebrow">GitHub-first onboarding</p>
        <h1>Continue with GitHub to start your repository health analysis</h1>
        <p className="hero-description">
          RepoGuard is designed to connect your GitHub account first, then move
          directly into repository analysis for security, quality, and maintenance
          signals.
        </p>

        <Card title="GitHub identity preview" subtitle="UI concept only">
          <div className="identity-preview">
            <div className="identity-avatar" aria-hidden="true">
              GH
            </div>
            <div>
              <p className="identity-name">@your-github-user</p>
              <p className="identity-meta">
                Future backend-backed GitHub profile data will appear here.
              </p>
            </div>
          </div>
        </Card>

        <div className="hero-actions">
          <Button to="/auth/callback">Continue with GitHub</Button>
          <Button to="/auth/callback" variant="secondary">
            View OAuth placeholder
          </Button>
        </div>
        <p className="hero-note">
          Real GitHub OAuth is not implemented yet. This flow is currently a
          frontend foundation and does not authenticate.
        </p>
      </section>

      <section className="section">
        <h2>What happens after GitHub connection</h2>
        <div className="check-grid">
          {checks.map((check) => (
            <Card key={check}>
              <p className="check-item">{check}</p>
            </Card>
          ))}
        </div>
      </section>

      <Card
        title="Current stage"
        subtitle="Frontend-only foundation for portfolio presentation"
      >
        <p>
          The current deployment demonstrates onboarding and future dashboard flow.
          Backend OAuth, GitHub API integration, and database persistence are planned
          next.
        </p>
      </Card>
    </div>
  )
}

export default LandingPage
