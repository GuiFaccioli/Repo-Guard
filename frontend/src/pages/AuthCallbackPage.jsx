import Button from '../components/Button'
import Card from '../components/Card'

function AuthCallbackPage() {
  return (
    <div className="page">
      <h1>OAuth callback route placeholder</h1>
      <p className="page-description">
        This route is reserved for future backend-backed GitHub OAuth callback
        handling.
      </p>

      <Card title="Current behavior" subtitle="Frontend-only placeholder">
        <ul className="trust-notes">
          <li>No authorization code is exchanged here.</li>
          <li>No GitHub token is created or stored in the frontend.</li>
          <li>No authenticated user session is active yet.</li>
        </ul>
      </Card>

      <div className="hero-actions">
        <Button to="/">Back to onboarding</Button>
        <Button to="/repositories" variant="secondary">
          View dashboard placeholder
        </Button>
      </div>
    </div>
  )
}

export default AuthCallbackPage
