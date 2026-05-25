import Card from '../components/Card'
import Button from '../components/Button'

function AuthCallbackPage() {
  return (
    <div className="page">
      <h1>GitHub OAuth callback placeholder</h1>
      <Card title="Coming soon" subtitle="Backend-backed authentication flow">
        <p>
          This route is reserved for the future GitHub OAuth callback. No real token
          exchange or authentication is happening in this frontend-only stage.
        </p>
      </Card>
      <div className="hero-actions">
        <Button to="/">Back to onboarding</Button>
        <Button to="/repositories" variant="secondary">
          Open dashboard placeholder
        </Button>
      </div>
    </div>
  )
}

export default AuthCallbackPage
