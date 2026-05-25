import Card from '../components/Card'

function AuthCallbackPage() {
  return (
    <div className="page">
      <h1>Callback de autenticacao</h1>
      <Card title="Status atual" subtitle="Placeholder de integracao">
        <p>
          Esta rota representara o retorno do GitHub OAuth. A implementacao real de
          autenticacao sera feita em etapa posterior.
        </p>
      </Card>
    </div>
  )
}

export default AuthCallbackPage
