import Button from '../components/Button'
import Card from '../components/Card'

const checks = [
  'README exists',
  '.gitignore exists',
  'package.json exists',
  'dependabot.yml exists',
  'GitHub Actions exists',
  'LICENSE exists',
  'recent last commit',
  'open issues',
  'open pull requests',
]

function LandingPage() {
  return (
    <div className="page page-landing">
      <section className="hero-section">
        <p className="eyebrow">Security and maintenance visibility</p>
        <h1>Monitor GitHub repository risk with practical, fast decisions</h1>
        <p className="hero-description">
          RepoGuard generates an objective repository health score using baseline
          checks for security, quality, and maintenance. The first version already
          highlights what needs attention first.
        </p>
        <div className="hero-actions">
          <Button to="/repositories">Connect with GitHub</Button>
          <Button to="/auth/callback" variant="secondary">
            View callback placeholder
          </Button>
        </div>
        <p className="hero-note">
          Real OAuth is not enabled in this stage. This button is navigation-only.
        </p>
      </section>

      <section className="section">
        <h2>Checks included in the MVP</h2>
        <div className="check-grid">
          {checks.map((check) => (
            <Card key={check}>
              <p className="check-item">{check}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <div className="flow-grid">
          <Card title="1. Connect account" subtitle="GitHub OAuth">
            <p>Authorize the minimum read access needed to list repositories and scan baseline signals.</p>
          </Card>
          <Card title="2. Run scan" subtitle="Objective analysis">
            <p>The scan calculates repository score, issue severity, and actionable recommendations.</p>
          </Card>
          <Card title="3. Track history" subtitle="Evolution over time">
            <p>Compare scans and track continuous improvements in repository health.</p>
          </Card>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
