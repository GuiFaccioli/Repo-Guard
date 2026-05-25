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
      <h1>Repositorios</h1>
      <p className="page-description">
        Lista placeholder para validar navegacao e estrutura visual antes da
        integracao real com API.
      </p>

      <div className="repo-grid">
        {mockRepositories.map((repository) => (
          <Card key={repository.id} title={repository.name}>
            <p className="card-subtitle">Visibilidade: {repository.visibility}</p>
            <Button to={`/repositories/${repository.id}`} variant="secondary">
              Ver detalhe
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default RepositoryListPage
