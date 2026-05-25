import Button from '../components/Button'
import Card from '../components/Card'

const mockRepositories = [
  { id: '1', name: 'repo-guard-api', score: 81, severity: 'medium' },
  { id: '2', name: 'repo-guard-dashboard', score: 92, severity: 'low' },
  { id: '3', name: 'infra-security-rules', score: 68, severity: 'high' },
]

function RepositoryListPage() {
  return (
    <div className="page">
      <h1>Repository analysis dashboard</h1>
      <p className="page-description">
        Future post-login screen. After GitHub connection, this page will show the
        authenticated user and a repository health overview.
      </p>

      <Card title="GitHub user preview" subtitle="Conceptual UI state">
        <div className="identity-preview">
          <div className="identity-avatar" aria-hidden="true">
            GH
          </div>
          <div>
            <p className="identity-name">Developer Name</p>
            <p className="identity-meta">
              Placeholder avatar and name. Real GitHub profile data will come from
              backend OAuth and GitHub API integration.
            </p>
          </div>
        </div>
      </Card>

      <div className="repo-grid">
        {mockRepositories.map((repository) => (
          <Card key={repository.id} title={repository.name}>
            <p className="card-subtitle">Repository score: {repository.score}/100</p>
            <p className="card-subtitle">Highest severity: {repository.severity}</p>
            <Button to={`/repositories/${repository.id}`} variant="secondary">
              View details
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default RepositoryListPage
