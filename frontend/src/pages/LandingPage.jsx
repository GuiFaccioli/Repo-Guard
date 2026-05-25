import Button from '../components/Button'
import Card from '../components/Card'

const checks = [
  'README existe',
  '.gitignore existe',
  'package.json existe',
  'dependabot.yml existe',
  'GitHub Actions existe',
  'LICENSE existe',
  'ultimo commit recente',
  'issues abertas',
  'pull requests abertas',
]

function LandingPage() {
  return (
    <div className="page page-landing">
      <section className="hero-section">
        <p className="eyebrow">Security and maintenance visibility</p>
        <h1>Monitore riscos de repositorios GitHub com foco em acao rapida</h1>
        <p className="hero-description">
          RepoGuard gera um score objetivo de saude do repositorio com checks basicos
          de seguranca, qualidade e manutencao. A primeira versao ja prioriza o que
          precisa de atencao.
        </p>
        <div className="hero-actions">
          <Button to="/repositories">Conectar com GitHub</Button>
          <Button to="/auth/callback" variant="secondary">
            Ver callback placeholder
          </Button>
        </div>
        <p className="hero-note">
          OAuth real ainda nao habilitado nesta etapa. Botao apenas de navegacao.
        </p>
      </section>

      <section className="section">
        <h2>Checks incluidos no MVP</h2>
        <div className="check-grid">
          {checks.map((check) => (
            <Card key={check}>
              <p className="check-item">{check}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Como funciona</h2>
        <div className="flow-grid">
          <Card title="1. Conectar conta" subtitle="GitHub OAuth">
            <p>Autorize a leitura necessaria para listar repositorios e analisar sinais basicos.</p>
          </Card>
          <Card title="2. Executar scan" subtitle="Analise objetiva">
            <p>O scan calcula score geral, severidade dos pontos e recomendacoes acionaveis.</p>
          </Card>
          <Card title="3. Acompanhar historico" subtitle="Evolucao ao longo do tempo">
            <p>Compare scans e acompanhe a melhoria continua da saude dos repositorios.</p>
          </Card>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
