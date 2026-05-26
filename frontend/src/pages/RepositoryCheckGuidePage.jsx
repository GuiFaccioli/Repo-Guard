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

function readJsonLocalStorage(key, fallbackValue) {
  try {
    const rawValue = window.localStorage.getItem(key)
    if (!rawValue) {
      return fallbackValue
    }

    return JSON.parse(rawValue)
  } catch {
    return fallbackValue
  }
}

function normalizeHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
    ? value.trim()
    : null
}

function normalizeGithubEvidenceUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const normalizedValue = value.trim()
  return /^https:\/\/github\.com\/[^\s?#]+(?:#L\d+)?$/i.test(normalizedValue)
    ? normalizedValue.slice(0, 2048)
    : null
}

function normalizeSafeCodeContextLines(codeContextInput) {
  if (!Array.isArray(codeContextInput)) {
    return null
  }

  const normalizedLines = codeContextInput
    .slice(0, 12)
    .map((line) => {
      if (!line || typeof line !== 'object') {
        return null
      }

      const lineNumber =
        Number.isFinite(line.lineNumber) && Number(line.lineNumber) > 0
          ? Math.floor(Number(line.lineNumber))
          : null
      const content =
        typeof line.content === 'string'
          ? line.content.replace(/\r/g, '').slice(0, 120)
          : ''

      if (!lineNumber) {
        return null
      }

      return {
        lineNumber,
        content,
        isFlaggedLine: line.isFlaggedLine ? true : undefined,
      }
    })
    .filter(Boolean)

  return normalizedLines.length ? normalizedLines : null
}

function resolveSafeEvidence(routeRepositoryId, checkId, routeState) {
  const cache =
    readJsonLocalStorage(SAFE_SCAN_EVIDENCE_CACHE_KEY, null) ||
    readJsonStorage(SAFE_SCAN_EVIDENCE_CACHE_KEY, {})
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
    typeof cachedCheckEvidence?.codeExcerpt === 'string' &&
    cachedCheckEvidence.codeExcerpt.trim()
      ? cachedCheckEvidence.codeExcerpt.trim()
      : typeof routeState?.codeExcerpt === 'string' && routeState.codeExcerpt.trim()
        ? routeState.codeExcerpt.trim()
        : null
  const codeContextCandidate =
    normalizeSafeCodeContextLines(cachedCheckEvidence?.codeContext) ||
    normalizeSafeCodeContextLines(routeState?.codeContext)
  const flaggedLineNumberCandidate =
    Number.isFinite(cachedCheckEvidence?.flaggedLineNumber) &&
    Number(cachedCheckEvidence.flaggedLineNumber) > 0
      ? Math.floor(Number(cachedCheckEvidence.flaggedLineNumber))
      : Number.isFinite(routeState?.flaggedLineNumber) &&
          Number(routeState.flaggedLineNumber) > 0
        ? Math.floor(Number(routeState.flaggedLineNumber))
        : null
  const flaggedLinePointerCandidate =
    typeof cachedCheckEvidence?.flaggedLinePointer === 'string' &&
    cachedCheckEvidence.flaggedLinePointer.trim()
      ? cachedCheckEvidence.flaggedLinePointer.trimEnd().slice(0, 100)
      : typeof routeState?.flaggedLinePointer === 'string' &&
          routeState.flaggedLinePointer.trim()
        ? routeState.flaggedLinePointer.trimEnd().slice(0, 100)
        : null
  const flaggedLineExplanationCandidate =
    typeof cachedCheckEvidence?.flaggedLineExplanation === 'string' &&
    cachedCheckEvidence.flaggedLineExplanation.trim()
      ? cachedCheckEvidence.flaggedLineExplanation.trim().slice(0, 220)
      : typeof routeState?.flaggedLineExplanation === 'string' &&
          routeState.flaggedLineExplanation.trim()
        ? routeState.flaggedLineExplanation.trim().slice(0, 220)
        : null

  const filePathCandidate =
    typeof cachedCheckEvidence?.filePath === 'string' &&
    cachedCheckEvidence.filePath.trim()
      ? cachedCheckEvidence.filePath.trim()
      : typeof routeState?.filePath === 'string' && routeState.filePath.trim()
        ? routeState.filePath.trim()
        : null

  const detailsCandidate =
    typeof cachedCheckEvidence?.details === 'string' &&
    cachedCheckEvidence.details.trim()
      ? cachedCheckEvidence.details.trim()
      : typeof routeState?.details === 'string' && routeState.details.trim()
        ? routeState.details.trim()
        : ''

  const githubFileUrlCandidate =
    normalizeGithubEvidenceUrl(cachedCheckEvidence?.githubFileUrl) ||
    normalizeGithubEvidenceUrl(routeState?.githubFileUrl)
  const githubFolderUrlCandidate =
    normalizeGithubEvidenceUrl(cachedCheckEvidence?.githubFolderUrl) ||
    normalizeGithubEvidenceUrl(routeState?.githubFolderUrl)

  return {
    status: routeStatus || cachedStatus,
    filePath: filePathCandidate,
    lineNumber: lineNumberCandidate,
    codeExcerpt: codeExcerptCandidate ? codeExcerptCandidate.slice(0, 220) : null,
    codeContext: codeContextCandidate,
    flaggedLineNumber: flaggedLineNumberCandidate,
    flaggedLinePointer: flaggedLinePointerCandidate,
    flaggedLineExplanation: flaggedLineExplanationCandidate,
    details: detailsCandidate,
    githubFileUrl: githubFileUrlCandidate,
    githubFolderUrl: githubFolderUrlCandidate,
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
      const url = normalizeHttpUrl(item?.url)

      if (!label || !url) {
        return null
      }

      return { label, url }
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
  const authMeUrl = useMemo(() => buildBackendUrl(apiBaseUrl, '/auth/me'), [apiBaseUrl])

  const routeRepositoryId = typeof id === 'string' ? id : ''
  const numericRouteRepositoryId = Number(id)
  const routeState =
    location.state && typeof location.state === 'object' ? location.state : {}

  const safeEvidence = useMemo(
    () => resolveSafeEvidence(routeRepositoryId, checkId, routeState),
    [checkId, routeRepositoryId, routeState],
  )
  const failedCodeSafetyView = codeSafetyCheck && safeEvidence.status === 'fail'
  const docsHeading = failedCodeSafetyView ? 'What\u2019s wrong?' : 'Learn more'
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

  const reviewedCodeContext = useMemo(
    () => (Array.isArray(safeEvidence.codeContext) ? safeEvidence.codeContext : []),
    [safeEvidence.codeContext],
  )

  const reviewedCodeExcerpt = useMemo(
    () => (safeEvidence.codeExcerpt ? safeEvidence.codeExcerpt : ''),
    [safeEvidence.codeExcerpt],
  )

  const flaggedLineNumber = useMemo(() => {
    if (Number.isFinite(safeEvidence.flaggedLineNumber) && Number(safeEvidence.flaggedLineNumber) > 0) {
      return Math.floor(Number(safeEvidence.flaggedLineNumber))
    }

    if (Number.isFinite(safeEvidence.lineNumber) && Number(safeEvidence.lineNumber) > 0) {
      return Math.floor(Number(safeEvidence.lineNumber))
    }

    return null
  }, [safeEvidence.flaggedLineNumber, safeEvidence.lineNumber])

  const flaggedLinePointer = useMemo(
    () =>
      typeof safeEvidence.flaggedLinePointer === 'string' && safeEvidence.flaggedLinePointer.trim()
        ? safeEvidence.flaggedLinePointer.trimEnd()
        : '',
    [safeEvidence.flaggedLinePointer],
  )

  const flaggedLineExplanation = useMemo(
    () =>
      typeof safeEvidence.flaggedLineExplanation === 'string' &&
      safeEvidence.flaggedLineExplanation.trim()
        ? safeEvidence.flaggedLineExplanation.trim()
        : '',
    [safeEvidence.flaggedLineExplanation],
  )

  const evidenceCodeSnippet = useMemo(() => {
    if (safeEvidence.codeExcerpt) {
      return safeEvidence.codeExcerpt
    }

    return ''
  }, [safeEvidence.codeExcerpt])

  const recommendedPatternSnippet = useMemo(() => {
    if (typeof guide?.recommendedPattern === 'string' && guide.recommendedPattern.trim()) {
      return guide.recommendedPattern.trim()
    }

    return saferExampleSnippet
  }, [guide, saferExampleSnippet])

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

  const whatIsWrongSummary = useMemo(() => {
    if (typeof guide?.whatIsWrongHere === 'string' && guide.whatIsWrongHere.trim()) {
      return guide.whatIsWrongHere.trim()
    }

    return attentionSummary
  }, [attentionSummary, guide])

  const githubEvidenceLink = useMemo(() => {
    if (safeEvidence.githubFileUrl) {
      return {
        label: 'Open file on GitHub \u2197',
        url: safeEvidence.githubFileUrl,
      }
    }

    if (safeEvidence.githubFolderUrl) {
      return {
        label: 'Open folder on GitHub \u2197',
        url: safeEvidence.githubFolderUrl,
      }
    }

    return null
  }, [safeEvidence.githubFileUrl, safeEvidence.githubFolderUrl])

  const [connectedLogin, setConnectedLogin] = useState(
    typeof routeState.connectedLogin === 'string' ? routeState.connectedLogin : '',
  )

  useEffect(() => {
    if (guide?.label) {
      document.title = failedCodeSafetyView
        ? `RepoGuard \u00b7 What\u2019s wrong? ${guide.label}`
        : `RepoGuard \u00b7 Learn more about ${guide.label}`
      return
    }

    document.title = 'RepoGuard \u00b7 Learn more'
  }, [failedCodeSafetyView, guide])

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
        <p className="detail-repository-meta detail-repository-eyebrow">
          Project report \u00b7 {repositoryFullName}
        </p>
        <h1>{guide.label}</h1>
        <p className="repository-guide-doc-heading">{docsHeading}</p>
        <p className="detail-repository-meta">{foundSummary}</p>
      </Card>

      <Card className="repository-guide-card">
        {failedCodeSafetyView ? (
          <>
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
              {githubEvidenceLink ? (
                <a
                  className="repository-guide-evidence-link"
                  href={githubEvidenceLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {githubEvidenceLink.label}
                </a>
              ) : null}
            </section>

            <section className="repository-guide-section repository-guide-section-card">
              <h3>Code section reviewed</h3>
              {reviewedCodeContext.length ? (
                <div className="repository-guide-reviewed-code">
                  {reviewedCodeContext.map((line) => {
                    const isFlaggedLine =
                      line.isFlaggedLine ||
                      (flaggedLineNumber && line.lineNumber === flaggedLineNumber)

                    return (
                      <div key={`${line.lineNumber}-${line.content}`} className="repository-guide-context-group">
                        <div
                          className={`repository-guide-context-line ${
                            isFlaggedLine ? 'repository-guide-context-line-flagged' : ''
                          }`.trim()}
                        >
                          <span className="repository-guide-context-line-number">{line.lineNumber}</span>
                          <code className="repository-guide-context-line-content">
                            {line.content || ' '}
                          </code>
                        </div>

                        {isFlaggedLine ? (
                          <div className="repository-guide-context-annotation">
                            {flaggedLinePointer ? (
                              <code className="repository-guide-context-pointer">
                                {flaggedLinePointer}
                              </code>
                            ) : null}
                            <p className="repository-guide-context-explanation">
                              {flaggedLineExplanation || 'This is the pattern RepoGuard flagged.'}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : reviewedCodeExcerpt ? (
                <pre className="repository-guide-code-block">
                  <code>{reviewedCodeExcerpt}</code>
                </pre>
              ) : (
                <p>RepoGuard found this signal, but no safe code excerpt is available.</p>
              )}
            </section>

            <section className="repository-guide-section repository-guide-section-card">
              <h3>What exactly looks fragile here?</h3>
              <p>{whatIsWrongSummary || guide.shortDescription}</p>
              {guide.whyMatters ? <p>{guide.whyMatters}</p> : null}
            </section>

            <section className="repository-guide-section repository-guide-section-card">
              <h3>Safer direction</h3>
              <p>{saferDirectionSummary}</p>
              {recommendedPatternSnippet ? (
                <pre className="repository-guide-code-block">
                  <code>{recommendedPatternSnippet}</code>
                </pre>
              ) : null}
            </section>

            <section className="repository-guide-section repository-guide-section-card" id="how-to-fix">
              <h3>How to improve</h3>
              {saferDirectionSteps.length ? (
                <ol className="scan-numbered-list repository-guide-steps">
                  {saferDirectionSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p>Review the safer direction above and apply it to this code path.</p>
              )}
            </section>
          </>
        ) : (
          <>
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
              {evidenceCodeSnippet ? (
                <pre className="repository-guide-code-block">
                  <code>{evidenceCodeSnippet}</code>
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
          </>
        )}

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
