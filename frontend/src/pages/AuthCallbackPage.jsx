import Card from '../components/Card'

function AuthCallbackPage() {
  return (
    <div className="page">
      <h1>Authentication callback</h1>
      <Card title="Current status" subtitle="Integration placeholder">
        <p>
          This route will represent the GitHub OAuth return flow. Real authentication
          implementation will be added in a later stage.
        </p>
      </Card>
    </div>
  )
}

export default AuthCallbackPage
