import Button from '../components/Button'
import Card from '../components/Card'

const metricCards = [
  { label: 'Total repositories', value: '--', helper: 'Waiting for GitHub auth' },
  { label: 'Average score', value: '--', helper: 'Calculated after first scan' },
  { label: 'High-risk repositories', value: '--', helper: 'Based on failed checks' },
  { label: 'Last scan', value: 'Not started', helper: 'No scan executed yet' },
]

const tableRows = [
  { name: 'repository-name', status: 'Pending auth', score: '--' },
  { name: 'another-repository', status: 'Pending auth', score: '--' },
]

function RepositoryListPage() {
  return (
    <div className="page dashboard-page">
      <h1>Repository analysis dashboard</h1>
      <p className="page-description">
        This is the post-login foundation. Real GitHub profile and repository data
        will appear here after backend OAuth and API integration.
      </p>

      <Card title="GitHub identity placeholder" subtitle="No authenticated data yet">
        <div className="identity-preview">
          <div className="identity-avatar" aria-hidden="true">
            GH
          </div>
          <div>
            <p className="identity-name">GitHub user not connected</p>
            <p className="identity-meta">
              Avatar and account name will be loaded after successful authentication.
            </p>
          </div>
        </div>
      </Card>

      <section className="metric-grid" aria-label="Repository health overview">
        {metricCards.map((item) => (
          <Card key={item.label} className="metric-card">
            <p className="metric-label">{item.label}</p>
            <p className="metric-value">{item.value}</p>
            <p className="metric-helper">{item.helper}</p>
          </Card>
        ))}
      </section>

      <Card title="Repositories placeholder list" subtitle="Future authenticated state">
        <div className="table-head">
          <span>Name</span>
          <span>Status</span>
          <span>Score</span>
        </div>
        <ul className="repo-table">
          {tableRows.map((row) => (
            <li key={row.name}>
              <span>{row.name}</span>
              <span className="status-pill">{row.status}</span>
              <span>{row.score}</span>
            </li>
          ))}
        </ul>
        <div className="table-actions">
          <Button to="/repositories/1" variant="secondary">
            Open repository details placeholder
          </Button>
        </div>
      </Card>

      <div className="state-grid">
        <Card title="Loading state preview">
          <p className="state-note">
            Loading repositories and scan history after authentication...
          </p>
        </Card>
        <Card title="Empty state preview">
          <p className="state-note">
            No repositories analyzed yet. Run your first scan after GitHub
            connection.
          </p>
        </Card>
      </div>
    </div>
  )
}

export default RepositoryListPage
