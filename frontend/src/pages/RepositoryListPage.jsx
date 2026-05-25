import Button from '../components/Button'
import Card from '../components/Card'

const mockRepositories = [
  { id: '1', name: 'repo-guard-api', visibility: 'private' },
  { id: '2', name: 'repo-guard-dashboard', visibility: 'public' },
  { id: '3', name: 'infra-security-rules', visibility: 'private' },
]

function RepositoryListPage() {
  return (
    <div className="page">
      <h1>Repositories</h1>
      <p className="page-description">
        Placeholder list to validate navigation and visual structure before
        real API integration.
      </p>

      <div className="repo-grid">
        {mockRepositories.map((repository) => (
          <Card key={repository.id} title={repository.name}>
            <p className="card-subtitle">Visibility: {repository.visibility}</p>
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
