import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  getRepositoryCheckGuideById,
  isCodeSafetyCheckId,
} from '../data/repositoryCheckGuides'
import { buildBackendUrl, normalizeApiBaseUrl } from '../utils/apiUrl'

const REPOSITORY_CACHE_KEY = 'repoguard.repositories.v1'
const SAFE_SCAN_EVIDENCE_CACHE_KEY = 'repoguard.safeScanEvidence.v1'

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

function resolveSafeEvidence(routeRepositoryId, checkId, routeState) {
  const cache = readJsonStorage(SAFE_SCAN_EVIDENCE_CACHE_KEY, {})
  const repositories =
    cache &&
    typeof cache === 'object' &&
    !Array.isArray(cache) &&
    cache.repositories &&
    typeof cache.repositories === 'object' &&
    !Array.isArray(cache.repositories)
      ? cache.repositories
      : {}
  const repositoryCache = repositories[String(routeRepositoryId)] || {}
  const checks =
    repositoryCache &&
    typeof repositoryCache === 'object' &&
    !Array.isArray(repositoryCache) &&
    repositoryCache.checks &&
    typeof repositoryCache.checks === 'object' &&
    !Array.isArray(repositoryCache.checks)
      ? repositoryCache.checks
      : {}
  const cachedCheckEvidence = checks[String(checkId)] || {}

  const readStatus = (value) => (value === 'pass' || value === 'fail' ? value : null)

  const routeStatus = readStatus(routeState?.checkStatus)
  const cachedStatus = readStatus(cachedCheckEvidence?.status)

  const lineNumberCandidate =
    Number.isFinite(routeState?.lineNumber) && Number(routeState.lineNumber) > 0
      ? Math.floor(Number(routeState.lineNumber))
      : Number.isFinite(cachedCheckEvidence?.lineNumber) &&
          Number(cachedCheckEvidence.lineNumber) > 0
        ? Math.floor(Number(cachedCheckEvidence.lineNumber))
        : null

  const codeExcerptCandidate =
    typeof routeState?.codeExcerpt === 'string' && routeState.codeExcerpt.trim()
      ? routeState.codeExcerpt.trim()
      : typeof cachedCheckEvidence?.codeExcerpt === 'string' &&
          cachedCheckEvidence.codeExcerpt.trim()
        ? cachedCheckEvidence.codeExcerpt.trim()
        : null

  const filePathCandidate =
    typeof routeState?.filePath === 'string' && routeState.filePath.trim()
      ? routeState.filePath.trim()
      : typeof cachedCheckEvidence?.filePath === 'string' &&
          cachedCheckEvidence.filePath.trim()
        ? cachedCheckEvidence.filePath.trim()
        : null

  const detailsCandidate =
    typeof routeState?.details === 'string' && routeState.details.trim()
      ? routeState.details.trim()
      : typeof cachedCheckEvidence?.details === 'string' && cachedCheckEvidence.details.trim()
        ? cachedCheckEvidence.details.trim()
        : ''

  return {
    status: routeStatus || cachedStatus,
    filePath: filePathCandidate,
    lineNumber: lineNumberCandidate,
    codeExcerpt: codeExcerptCandidate ? codeExcerptCandidate.slice(0, 220) : null,
    details: detailsCandidate,
    repositoryFullName:
      typeof repositoryCache?.repositoryFullName === 'string' &&
      repositoryCache.repositoryFullName.trim()
        ? repositoryCache.repositoryFullName.trim()
        : '',
  }
}

function extractSafeExample(guide) {
  if (!Array.isArray(guide?.howToFix)) {
    return ''
  }

  const safeExampleStep = guide.howToFix.find(
    (step) => typeof step === 'string' && /^safe example:\s*/i.test(step),
  )

  if (!safeExampleStep) {
    return ''
  }

  return safeExampleStep.replace(/^safe example:\s*/i, '').trim()
}

function RepositoryCheckGuidePage() {
  const { id, checkId } = useParams()
  const location = useLocation()
  const guide = getRepositoryCheckGuideById(checkId)
  const codeSafetyCheck = isCodeSafetyCheckId(checkId)

  const rawApiBaseUrl = import.meta.env.VITE_API_URL
  const apiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(rawApiBaseUrl),
    [rawApiBaseUrl],
  )
  const authMeUrl = useMemo(
    () => buildBackendUrl(apiBaseUrl, '/auth/me'),
    [apiBaseUrl],
  )

  const routeRepositoryId = typeof id === 'string' ? id : ''
  const numericRouteRepositoryId = Number(id)
  const routeState = location.state && typeof location.state === 'object'
    ? location.state
    : {}
  const safeEvidence = useMemo(
    () => resolveSafeEvidence(routeRepositoryId, checkId, routeState),
    [checkId, routeRepositoryId, routeState],
  )
  const failedCodeSafetyView = codeSafetyCheck && safeEvidence.status === 'fail'
  const safeExample = useMemo(() => extractSafeExample(guide), [guide])
  const saferDirectionSteps = useMemo(() => {
    if (!Array.isArray(guide?.howToFix)) {
      return []
    }

    return guide.howToFix
      .filter((step) => typeof step === 'string' && !/^safe example:\s*/i.test(step))
      .slice(0, 3)
  }, [guide])

  const [connectedLogin, setConnectedLogin] = useState(
    typeof routeState.connectedLogin === 'string' ? routeState.connectedLogin : '',
  )

  useEffect(() => {
    if (guide?.label) {
      document.title = `RepoGuard · Learn more about ${guide.label}`
      return
    }
    document.title = 'RepoGuard · Learn more'
  }, [guide])

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

    if (safeEvidence.repositoryFullName) {
      return safeEvidence.repositoryFullName
    }

    const cachedRepositories = readJsonStorage(REPOSITORY_CACHE_KEY, [])
    if (!Array.isArray(cachedRepositories)) {
      return 'Selected repository'
    }

    const matched = cachedRepositories.find(
      (repository) => Number(repository.id) === numericRouteRepositoryId,
    )

    if (matched?.fullName) {
      return matched.fullName
    }

    return 'Selected repository'
  }, [numericRouteRepositoryId, routeState.repositoryFullName, safeEvidence.repositoryFullName])

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
        {failedCodeSafetyView ? (
          <>
            <p className="repository-guide-summary">What’s wrong?</p>

            <section className="repository-guide-section">
              <h3>Where RepoGuard found it</h3>
              {safeEvidence.filePath ? (
                <p>
                  File:{' '}
                  <span className="scan-result-file-path">{safeEvidence.filePath}</span>
                </p>
              ) : (
                <p>File location is not available for this signal.</p>
              )}
              {safeEvidence.lineNumber ? <p>Line: {safeEvidence.lineNumber}</p> : null}
            </section>

            <section className="repository-guide-section">
              <h3>Current code pattern</h3>
              {safeEvidence.codeExcerpt ? (
                <pre className="repository-guide-code-block">
                  <code>{safeEvidence.codeExcerpt}</code>
                </pre>
              ) : (
                <p>RepoGuard found this signal, but no safe code excerpt is available.</p>
              )}
            </section>

            <section className="repository-guide-section">
              <h3>Why this needs attention</h3>
              <p>{safeEvidence.details || guide.shortDescription}</p>
              <p>{guide.whyMatters}</p>
            </section>

            <section className="repository-guide-section" id="how-to-fix">
              <h3>Safer direction</h3>
              {saferDirectionSteps.length ? (
                <ol className="scan-numbered-list repository-guide-steps">
                  {saferDirectionSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}
              {safeExample ? (
                <pre className="repository-guide-code-block">
                  <code>{safeExample}</code>
                </pre>
              ) : null}
            </section>

            <section className="repository-guide-section">
              <h3>About this check</h3>
              <p>{guide.whyChecked}</p>
            </section>
          </>
        ) : (
          <>
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
          </>
        )}

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
