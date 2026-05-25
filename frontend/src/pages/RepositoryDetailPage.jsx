import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'

const placeholderChecks = [
  { name: 'README', status: 'ok' },
  { name: 'Dependabot', status: 'pendente' },
  { name: 'GitHub Actions', status: 'ok' },
]

function RepositoryDetailPage() {
  const { id } = useParams()

  return (
    <div className="page">
      <h1>Detalhe do repositorio #{id}</h1>
      <p className="page-description">
        Pagina inicial para score, checks, severidade e historico de scans.
      </p>

      <div className="repo-grid">
        <Card title="Score atual" subtitle="Placeholder">
          <p className="score-value">78/100</p>
        </Card>

        <Card title="Ultimo scan" subtitle="Placeholder">
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

      <Button>Rodar analise (placeholder)</Button>
    </div>
  )
}

export default RepositoryDetailPage
