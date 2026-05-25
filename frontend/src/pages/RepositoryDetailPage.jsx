import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'

const placeholderChecks = [
  { name: 'README', status: 'ok' },
  { name: 'Dependabot', status: 'pending' },
  { name: 'GitHub Actions', status: 'ok' },
]

function RepositoryDetailPage() {
  const { id } = useParams()

  return (
    <div className="page">
      <h1>Repository details #{id}</h1>
      <p className="page-description">
        Initial page for repository score, checks, severity, and scan history.
      </p>

      <div className="repo-grid">
        <Card title="Current score" subtitle="Placeholder">
          <p className="score-value">78/100</p>
        </Card>

        <Card title="Latest scan" subtitle="Placeholder">
          <ul className="check-list">
            {placeholderChecks.map((check) => (
              <li key={check.name}>
                <span>{check.name}</span>
                <span className="status-pill">{check.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Button>Run scan (placeholder)</Button>
    </div>
  )
}

export default RepositoryDetailPage
