import { useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'

function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const oauthError = searchParams.get('error')
  const hasOAuthFailure = oauthError === 'oauth_failed'

  const title = hasOAuthFailure
    ? 'GitHub authentication could not be completed'
    : 'GitHub callback status'

  const description = hasOAuthFailure
    ? 'RepoGuard could not complete your GitHub authentication. Return to onboarding and try connecting again.'
    : 'GitHub OAuth is handled by the backend. If authentication succeeds, RepoGuard redirects to the repository dashboard.'

  return (
    <div className="page">
      <h1>{title}</h1>
      <p className="page-description">{description}</p>

      <Card
        title={hasOAuthFailure ? 'Authentication error details' : 'Current behavior'}
        subtitle={
          hasOAuthFailure
            ? 'Safe troubleshooting guidance'
            : 'Production-safe callback notes'
        }
      >
        <ul className="trust-notes">
          <li>GitHub authorization code exchange happens in the backend.</li>
          <li>No GitHub token is created or stored in the frontend.</li>
          {hasOAuthFailure ? (
            <li>
              Return to onboarding and run "Continue with GitHub" again to start a
              new authentication attempt.
            </li>
          ) : (
            <li>If needed, return to onboarding to start a fresh login flow.</li>
          )}
        </ul>
      </Card>

      <div className="hero-actions">
        <Button to="/">Back to onboarding</Button>
        <Button to="/repositories" variant="secondary">
          Go to dashboard
        </Button>
      </div>
    </div>
  )
}

export default AuthCallbackPage
