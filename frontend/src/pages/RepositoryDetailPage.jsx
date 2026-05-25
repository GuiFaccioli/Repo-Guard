import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'

const placeholderChecks = [
  { name: 'README', status: 'pending' },
  { name: 'Dependabot', status: 'pending' },
  { name: 'GitHub Actions', status: 'pending' },
  { name: 'License', status: 'pending' },
]

function RepositoryDetailPage() {
  const { id } = useParams()

  return (
    <div className="page">
      <h1>Repository details placeholder #{id}</h1>
      <p className="page-description">
        Future authenticated page for repository score details, failed checks, and
        recommendation priorities.
      </p>

      <div className="repo-grid">
        <Card title="Repository score" subtitle="Will load after first scan">
          <p className="score-value">--</p>
        </Card>

        <Card title="Last scan status" subtitle="No real data yet">
          <p className="state-note">Waiting for authentication and backend scan flow.</p>
        </Card>
      </div>

      <Card title="Checks placeholder" subtitle="Expected scan output structure">
        <ul className="check-list">
          {placeholderChecks.map((check) => (
            <li key={check.name}>
              <span>{check.name}</span>
              <span className="status-pill">{check.status}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="hero-actions">
        <Button>Run scan (coming soon)</Button>
        <Button to="/repositories" variant="secondary">
          Back to dashboard placeholder
        </Button>
      </div>
    </div>
  )
}

export default RepositoryDetailPage
