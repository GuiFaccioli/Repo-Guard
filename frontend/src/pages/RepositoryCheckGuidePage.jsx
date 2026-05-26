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

function normalizeOfficialDocsLinks(guide) {
  if (!Array.isArray(guide?.officialDocs)) {
    return []
  }

  return guide.officialDocs
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const label = typeof item.label === 'string' ? item.label.trim() : ''
      const url = typeof item.url === 'string' ? item.url.trim() : ''
      const validUrl = /^https?:\/\//i.test(url) ? url : ''

      if (!label || !validUrl) {
        return null
      }

      return { label, url: validUrl }
    })
    .filter(Boolean)
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
  const routeState =
    location.state && typeof location.state === 'object' ? location.state : {}

  const safeEvidence = useMemo(
    () => resolveSafeEvidence(routeRepositoryId, checkId, routeState),
    [checkId, routeRepositoryId, routeState],
  )
  const failedCodeSafetyView = codeSafetyCheck && safeEvidence.status === 'fail'
  const docsHeading = failedCodeSafetyView ? 'What’s wrong?' : 'Learn more'
  const officialDocs = useMemo(() => normalizeOfficialDocsLinks(guide), [guide])
  const safeExample = useMemo(() => extractSafeExample(guide), [guide])
  const saferDirectionSteps = useMemo(() => {
    if (!Array.isArray(guide?.howToFix)) {
      return []
    }

    return guide.howToFix
      .filter((step) => typeof step === 'string' && !/^safe example:\s*/i.test(step))
      .slice(0, 3)
  }, [guide])
  const saferDirectionSummary = useMemo(() => {
    if (typeof guide?.saferDirection === 'string' && guide.saferDirection.trim()) {
      return guide.saferDirection.trim()
    }

    return saferDirectionSteps[0] || 'Use a safer, explicit implementation pattern for this check.'
  }, [guide, saferDirectionSteps])
  const saferExampleSnippet = useMemo(() => {
    if (typeof guide?.saferExample === 'string' && guide.saferExample.trim()) {
      return guide.saferExample.trim()
    }

    return safeExample
  }, [guide, safeExample])
  const foundSummary = useMemo(() => {
    if (safeEvidence.details) {
      return safeEvidence.details
    }

    if (typeof guide?.whatRepoGuardFound === 'string' && guide.whatRepoGuardFound.trim()) {
      return guide.whatRepoGuardFound.trim()
    }

    return guide?.shortDescription || ''
  }, [guide, safeEvidence.details])
  const attentionSummary = useMemo(() => {
    if (typeof guide?.whyNeedsAttention === 'string' && guide.whyNeedsAttention.trim()) {
      return guide.whyNeedsAttention.trim()
    }

    return guide?.whyMatters || ''
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
    if (
      typeof routeState.repositoryFullName === 'string' &&
      routeState.repositoryFullName.trim()
    ) {
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
            <p className="page-topbar-brand">RepoGuard Docs</p>
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
          <p className="page-topbar-brand">RepoGuard Docs</p>
          <p className="page-topbar-user">@{connectedLogin} connected</p>
        </div>
      ) : null}

      <Card className="detail-repository-card repository-guide-header-card">
        <div className="detail-repository-header">
          <Button to={`/repositories/${id}`} variant="secondary">
            {'\u2190'} Back to report
          </Button>
        </div>
        <p className="detail-repository-meta detail-repository-eyebrow">Project report · {repositoryFullName}</p>
        <h1>{guide.label}</h1>
        <p className="repository-guide-doc-heading">{docsHeading}</p>
        <p className="detail-repository-meta">{foundSummary}</p>
      </Card>

      <Card className="repository-guide-card">
        <section className="repository-guide-section repository-guide-section-card">
          <h3>Where RepoGuard found it</h3>
          {safeEvidence.filePath ? (
            <p>
              File: <span className="scan-result-file-path">{safeEvidence.filePath}</span>
            </p>
          ) : (
            <p>File location is not available for this signal.</p>
          )}
          {safeEvidence.lineNumber ? <p>Line: {safeEvidence.lineNumber}</p> : null}
        </section>

        <section className="repository-guide-section repository-guide-section-card">
          <h3>Current code pattern</h3>
          {safeEvidence.codeExcerpt ? (
            <pre className="repository-guide-code-block">
              <code>{safeEvidence.codeExcerpt}</code>
            </pre>
          ) : (
            <p>RepoGuard found this signal, but no safe code excerpt is available.</p>
          )}
        </section>

        <section className="repository-guide-section repository-guide-section-card">
          <h3>Why this needs attention</h3>
          <p>{attentionSummary || guide.shortDescription}</p>
          <p>{guide.whyMatters}</p>
        </section>

        <section className="repository-guide-section repository-guide-section-card" id="how-to-fix">
          <h3>Safer direction</h3>
          <p>{saferDirectionSummary}</p>
          {saferDirectionSteps.length ? (
            <ol className="scan-numbered-list repository-guide-steps">
              {saferDirectionSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          {saferExampleSnippet ? (
            <pre className="repository-guide-code-block">
              <code>{saferExampleSnippet}</code>
            </pre>
          ) : null}
        </section>

        <section className="repository-guide-section repository-guide-section-card">
          <h3>About this check</h3>
          <p>{guide.whatItIs}</p>
          <p>{guide.whyChecked}</p>
        </section>

        {officialDocs.length ? (
          <section className="repository-guide-section repository-guide-section-card repository-guide-doc-links">
            <h3>Official documentation</h3>
            <ul className="repository-guide-doc-list">
              {officialDocs.map((doc) => (
                <li key={doc.url}>
                  <a
                    className="repository-guide-doc-link"
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {doc.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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
