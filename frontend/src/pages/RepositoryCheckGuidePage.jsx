import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  getRepositoryCheckGuideById,
} from '../data/repositoryCheckGuides'
import { buildBackendUrl, normalizeApiBaseUrl } from '../utils/apiUrl'

const REPOSITORY_CACHE_KEY = 'repoguard.repositories.v1'

function readJsonStorage(key, fallbackValue) {
  try {
    const rawValue = window.sessionStorage.getItem(key)
    if (!rawValue) {
      return fallbackValue
    }

    return JSON.parse(rawValue)
  } catch {
    return fallbackValue
  }
}

function RepositoryCheckGuidePage() {
  const { id, checkId } = useParams()
  const location = useLocation()
  const guide = getRepositoryCheckGuideById(checkId)

  const rawApiBaseUrl = import.meta.env.VITE_API_URL
  const apiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(rawApiBaseUrl),
    [rawApiBaseUrl],
  )
  const authMeUrl = useMemo(
    () => buildBackendUrl(apiBaseUrl, '/auth/me'),
    [apiBaseUrl],
  )

  const routeRepositoryId = Number(id)
  const routeState = location.state && typeof location.state === 'object'
    ? location.state
    : {}

  const [connectedLogin, setConnectedLogin] = useState(
    typeof routeState.connectedLogin === 'string' ? routeState.connectedLogin : '',
  )

  useEffect(() => {
    if (connectedLogin || !authMeUrl) {
      return
    }

    let cancelled = false

    const loadSession = async () => {
      try {
        const response = await fetch(authMeUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          return
        }

        const payload = await response.json()
        if (cancelled) {
          return
        }

        if (payload?.authenticated && payload?.user?.login) {
          setConnectedLogin(payload.user.login)
        }
      } catch {
        // Keep guide view stable even when session refresh fails.
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [authMeUrl, connectedLogin])

  const repositoryFullName = useMemo(() => {
    if (typeof routeState.repositoryFullName === 'string' && routeState.repositoryFullName.trim()) {
      return routeState.repositoryFullName
    }

    const cachedRepositories = readJsonStorage(REPOSITORY_CACHE_KEY, [])
    if (!Array.isArray(cachedRepositories)) {
      return 'Selected repository'
    }

    const matched = cachedRepositories.find(
      (repository) => Number(repository.id) === routeRepositoryId,
    )

    if (matched?.fullName) {
      return matched.fullName
    }

    return 'Selected repository'
  }, [routeRepositoryId, routeState.repositoryFullName])

  if (!guide) {
    return (
      <div className="page repository-check-guide-page">
        {connectedLogin ? (
          <div className="page-topbar">
            <p className="page-topbar-brand">RepoGuard</p>
            <p className="page-topbar-user">@{connectedLogin} connected</p>
          </div>
        ) : null}

        <Card>
          <h1>Check guide not found</h1>
          <p className="page-description">
            RepoGuard could not find documentation for this check yet.
          </p>
          <div className="hero-actions">
            <Button to={`/repositories/${id}`} variant="secondary">
              Back to report
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="page repository-check-guide-page">
      {connectedLogin ? (
        <div className="page-topbar">
          <p className="page-topbar-brand">RepoGuard</p>
          <p className="page-topbar-user">@{connectedLogin} connected</p>
        </div>
      ) : null}

      <Card className="detail-repository-card">
        <div className="detail-repository-header">
          <Button to={`/repositories/${id}`} variant="secondary">
            {'\u2190'} Back
          </Button>
        </div>
        <p className="detail-repository-meta detail-repository-eyebrow">Project report</p>
        <h1>{repositoryFullName}</h1>
        <p className="detail-repository-meta">Minimal repository diagnosis</p>
      </Card>

      <Card className="repository-guide-card">
        <h2>{guide.label}</h2>
        <p className="repository-guide-summary">{guide.shortDescription}</p>

        <section className="repository-guide-section">
          <h3>What this is</h3>
          <p>{guide.whatItIs}</p>
        </section>

        <section className="repository-guide-section">
          <h3>Why RepoGuard checks it</h3>
          <p>{guide.whyChecked}</p>
        </section>

        <section className="repository-guide-section">
          <h3>Why it matters</h3>
          <p>{guide.whyMatters}</p>
        </section>

        <section className="repository-guide-section" id="how-to-fix">
          <h3>How to fix</h3>
          <ol className="scan-numbered-list repository-guide-steps">
            {guide.howToFix.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <div className="hero-actions">
          <Button to={`/repositories/${id}`} variant="secondary">
            Back to report
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default RepositoryCheckGuidePage
