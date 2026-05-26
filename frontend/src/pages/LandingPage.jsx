import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  CODE_SAFETY_CHECK_IDS,
  resolveRepositoryCheckId,
} from '../data/repositoryCheckGuides'
import { buildBackendUrl, normalizeApiBaseUrl } from '../utils/apiUrl'
import { normalizeRepositoryUrl } from '../utils/repositoryUrl'

const CHECKLIST_OPTIONS = [
  {
    id: 'good_practices',
    label: 'Good practices',
    description: 'Baseline documentation, automation, and maintenance signals.',
  },
  {
    id: 'security_basics',
    label: 'Code safety signals',
    description: 'Defensive checks for secret handling and risky code patterns.',
  },
]

const initialScanState = {
  status: 'idle',
  result: null,
  error: '',
}

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

function writeJsonStorage(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage write failures to keep scan rendering stable.
  }
}

function buildGuideRouteRepositoryId(repository) {
  const provider = typeof repository?.provider === 'string' ? repository.provider.trim() : ''
  const owner = typeof repository?.owner === 'string' ? repository.owner.trim() : ''
  const name = typeof repository?.name === 'string' ? repository.name.trim() : ''

  const rawToken = [provider, owner, name].filter(Boolean).join('-')
  const normalizedToken = rawToken.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-')

  return normalizedToken || 'selected-repository'
}

function buildGuideRepositoryFullName(repository) {
  const owner = typeof repository?.owner === 'string' ? repository.owner.trim() : ''
  const name = typeof repository?.name === 'string' ? repository.name.trim() : ''

  if (owner && name) {
    return `${owner} / ${name}`
  }

  return 'Selected repository'
}

function buildScannedRepositoryName(repository) {
  const owner = typeof repository?.owner === 'string' ? repository.owner.trim() : ''
  const name = typeof repository?.name === 'string' ? repository.name.trim() : ''

  if (owner && name) {
    return `${owner} / ${name}`
  }

  return 'Selected repository'
}

function LandingPage() {
  const rawApiBaseUrl = import.meta.env.VITE_API_URL
  const apiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(rawApiBaseUrl),
    [rawApiBaseUrl],
  )
  const scansUrl = useMemo(() => buildBackendUrl(apiBaseUrl, '/scans'), [apiBaseUrl])

  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [selectedChecklists, setSelectedChecklists] = useState([
    'good_practices',
    'security_basics',
  ])
  const [scanState, setScanState] = useState(initialScanState)
  const [urlTouched, setUrlTouched] = useState(false)
  const [checklistTouched, setChecklistTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const repositoryTarget = useMemo(
    () => normalizeRepositoryUrl(repositoryUrl),
    [repositoryUrl],
  )

  const scannedRepository = scanState.result?.repository
  const routeRepositoryId = useMemo(
    () => buildGuideRouteRepositoryId(scannedRepository),
    [scannedRepository],
  )
  const repositoryFullName = useMemo(
    () => buildGuideRepositoryFullName(scannedRepository),
    [scannedRepository],
  )
  const scannedRepositoryName = useMemo(
    () => buildScannedRepositoryName(scannedRepository),
    [scannedRepository],
  )

  const isRepositoryUrlValid = Boolean(repositoryTarget)
  const hasChecklistSelection = selectedChecklists.length > 0
  const canStartScan =
    Boolean(scansUrl && isRepositoryUrlValid && hasChecklistSelection) &&
    scanState.status !== 'loading'

  useEffect(() => {
    if (scanState.status !== 'success' || !scanState.result) {
      return
    }

    const resultGroups = Array.isArray(scanState.result.results)
      ? scanState.result.results
      : []
    const repositoryEvidenceChecks = {}

    for (const group of resultGroups) {
      if (group?.checklist !== 'security_basics' || !Array.isArray(group.items)) {
        continue
      }

      for (const item of group.items) {
        const resolvedCheckId = resolveRepositoryCheckId({
          label: item?.label,
        })

        if (!resolvedCheckId || !CODE_SAFETY_CHECK_IDS.has(resolvedCheckId)) {
          continue
        }

        const safeEvidence = {
          checklist: 'security_basics',
          checkId: resolvedCheckId,
          label: typeof item?.label === 'string' ? item.label : '',
          status: item?.status === 'pass' ? 'pass' : 'fail',
          details: typeof item?.details === 'string' ? item.details : '',
          filePath:
            typeof item?.filePath === 'string' && item.filePath.trim()
              ? item.filePath.trim()
              : null,
          lineNumber:
            Number.isFinite(item?.lineNumber) && Number(item.lineNumber) > 0
              ? Math.floor(Number(item.lineNumber))
              : null,
          codeExcerpt:
            typeof item?.codeExcerpt === 'string' && item.codeExcerpt.trim()
              ? item.codeExcerpt.trim().slice(0, 220)
              : null,
        }

        repositoryEvidenceChecks[resolvedCheckId] = safeEvidence
      }
    }

    const previousCache = readJsonStorage(SAFE_SCAN_EVIDENCE_CACHE_KEY, {})
    const previousRepositories =
      previousCache &&
      typeof previousCache === 'object' &&
      !Array.isArray(previousCache) &&
      previousCache.repositories &&
      typeof previousCache.repositories === 'object' &&
      !Array.isArray(previousCache.repositories)
        ? previousCache.repositories
        : {}

    const repositoryKey = routeRepositoryId
    const nextCache = {
      repositories: {
        ...previousRepositories,
        [repositoryKey]: {
          repositoryFullName,
          checks: repositoryEvidenceChecks,
          updatedAt: new Date().toISOString(),
        },
      },
    }

    writeJsonStorage(SAFE_SCAN_EVIDENCE_CACHE_KEY, nextCache)
  }, [repositoryFullName, routeRepositoryId, scanState.result, scanState.status])

  useEffect(() => {
    document.title = 'RepoGuard · Scan repository'
  }, [])

  const urlErrorMessage =
    (urlTouched || submitAttempted) && !isRepositoryUrlValid
      ? 'Enter a supported GitHub, GitLab, or Bitbucket repository URL.'
      : ''

  const checklistErrorMessage =
    (checklistTouched || submitAttempted) && !hasChecklistSelection
      ? 'Select at least one checklist to continue.'
      : ''

  const buildScanErrorMessage = (statusCode) => {
    if (statusCode === 404) {
      return 'RepoGuard could not access that repository. Check the link and try again.'
    }

    if (statusCode === 422) {
      return 'RepoGuard could not normalize that repository URL.'
    }

    if (statusCode === 400) {
      return 'Please review the repository URL and checklist selection.'
    }

    return 'RepoGuard could not complete the scan. Try again in a moment.'
  }

  const executeScan = async () => {
    setUrlTouched(true)
    setChecklistTouched(true)
    setSubmitAttempted(true)

    if (!scansUrl || !isRepositoryUrlValid || !hasChecklistSelection) {
      return
    }

    setScanState({
      status: 'loading',
      result: null,
      error: '',
    })

    try {
      const response = await fetch(scansUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryUrl: repositoryTarget.url,
          checklists: selectedChecklists,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const message =
          typeof payload?.message === 'string' && payload.message.trim()
            ? payload.message
            : buildScanErrorMessage(response.status)

        setScanState({
          status: 'error',
          result: null,
          error: message,
        })
        return
      }

      const payload = await response.json()
      setScanState({
        status: 'success',
        result: payload,
        error: '',
      })
    } catch {
      setScanState({
        status: 'error',
        result: null,
        error: buildScanErrorMessage(500),
      })
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    void executeScan()
  }

  const handleRetry = () => {
    void executeScan()
  }

  const handleChecklistToggle = (checklistId) => {
    setChecklistTouched(true)
    setSelectedChecklists((current) => {
      if (current.includes(checklistId)) {
        return current.filter((item) => item !== checklistId)
      }

      return [...current, checklistId]
    })
  }

  return (
    <div className="page scan-page">
      <Card className="scan-intro-card">
        <p className="onboarding-brand">RepoGuard</p>
        <h1>Scan a repository</h1>
        <p className="page-description">
          Paste a repository URL, choose at least one checklist, and RepoGuard will run a
          focused report.
        </p>
      </Card>

      <Card className="scan-form-card">
        <form className="scan-form" onSubmit={handleSubmit}>
          <div className="scan-field-group">
            <label className="scan-field-label" htmlFor="repository-url">
              Paste the repository link
            </label>
            <input
              id="repository-url"
              name="repository-url"
              className={`scan-input ${urlErrorMessage ? 'scan-input-error' : ''}`.trim()}
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck="false"
              placeholder="https://github.com/user/repo"
              value={repositoryUrl}
              onChange={(event) => setRepositoryUrl(event.target.value)}
              onBlur={() => setUrlTouched(true)}
            />
            <p className="scan-field-help">
              Supported hosts: GitHub, GitLab, and Bitbucket.
            </p>
            {urlErrorMessage ? (
              <p className="scan-field-error-message" role="alert">
                {urlErrorMessage}
              </p>
            ) : null}
          </div>

          <fieldset className="scan-checklist-fieldset">
            <legend className="scan-field-label">Choose at least 1 checklist to analyze</legend>

            <div className="scan-checklist-grid">
              {CHECKLIST_OPTIONS.map((option) => {
                const isChecked = selectedChecklists.includes(option.id)

                return (
                  <label key={option.id} className="scan-checklist-option">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleChecklistToggle(option.id)}
                    />
                    <span className="scan-checklist-copy">
                      <span className="scan-checklist-title">{option.label}</span>
                      <span className="scan-checklist-description">{option.description}</span>
                    </span>
                  </label>
                )
              })}
            </div>

            {checklistErrorMessage ? (
              <p className="scan-field-error-message" role="alert">
                {checklistErrorMessage}
              </p>
            ) : null}
          </fieldset>

          <div className="scan-actions">
            <Button type="submit" disabled={!canStartScan || scanState.status === 'loading'}>
              Start scan
            </Button>
          </div>
        </form>
      </Card>

      {scanState.status === 'loading' ? (
        <Card className="scan-state-card" title="Scanning repository">
          <p className="state-note scan-state-message">
            RepoGuard is checking repository health signals.
          </p>
        </Card>
      ) : null}

      {scanState.status === 'error' ? (
        <Card className="scan-state-card" title="Scan could not be completed">
          <p className="state-note scan-state-message">{scanState.error}</p>
          <div className="hero-actions scan-state-actions">
            <Button type="button" onClick={handleRetry}>
              Retry scan
            </Button>
          </div>
        </Card>
      ) : null}

      {scanState.status === 'success' && scanState.result ? (
        <section className="scan-results" aria-label="Scan results">
          <Card className="scan-results-intro">
            <p className="scan-results-eyebrow">Project report</p>
            <h2>{scannedRepositoryName}</h2>
            <p className="page-description">
              RepoGuard checked repository health and code safety signals.
            </p>
          </Card>

          {Array.isArray(scanState.result.results)
            ? scanState.result.results.map((group) => (
                <Card key={group.checklist} className="scan-result-card" title={group.title}>
                  <ul className="scan-result-list">
                    {Array.isArray(group.items)
                      ? group.items.map((item) => {
                          const mappedCheckId = resolveRepositoryCheckId({
                            label: item.label,
                          })
                          const fallbackCheckId =
                            group.checklist === 'security_basics'
                              ? 'hardcoded-secret'
                              : 'readme'
                          const checkId = mappedCheckId || fallbackCheckId
                          const isPassed = item.status === 'pass'
                          const isCodeSafetySignal = group.checklist === 'security_basics'
                          const learnMoreLabel = isCodeSafetySignal
                            ? isPassed
                              ? 'Learn why this matters \u2197'
                              : 'What\u2019s wrong? \u2197'
                            : isPassed
                              ? 'Learn why this matters \u2197'
                              : 'Learn how to improve this \u2197'

                          return (
                            <li
                              key={`${group.checklist}-${item.label}`}
                              className={`scan-result-item scan-result-item-${item.status}`.trim()}
                            >
                              <div className="scan-result-copy">
                                <p className="scan-result-title">
                                  <span className="scan-result-icon" aria-hidden="true">
                                    {item.status === 'pass' ? '\u2713' : '\u2715'}
                                  </span>
                                  <span className="scan-result-label">{item.label}</span>
                                </p>
                                {typeof item.filePath === 'string' && item.filePath.trim() ? (
                                  <p className="scan-result-file">
                                    File:{' '}
                                    <span className="scan-result-file-path">{item.filePath}</span>
                                  </p>
                                ) : null}
                                <p className="scan-result-details">{item.details}</p>
                                <Link
                                  className="scan-result-learn-more"
                                  to={`/repositories/${routeRepositoryId}/checks/${checkId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  state={{
                                    repositoryFullName,
                                    checklistId: group.checklist,
                                    checkStatus: item.status,
                                    checkLabel: item.label,
                                    filePath:
                                      typeof item.filePath === 'string' && item.filePath.trim()
                                        ? item.filePath.trim()
                                        : null,
                                    lineNumber:
                                      Number.isFinite(item.lineNumber) &&
                                      Number(item.lineNumber) > 0
                                        ? Math.floor(Number(item.lineNumber))
                                        : null,
                                    codeExcerpt:
                                      typeof item.codeExcerpt === 'string' &&
                                      item.codeExcerpt.trim()
                                        ? item.codeExcerpt.trim().slice(0, 220)
                                        : null,
                                  }}
                                >
                                  {learnMoreLabel}
                                </Link>
                              </div>
                            </li>
                          )
                        })
                      : null}
                  </ul>
                </Card>
              ))
            : null}
        </section>
      ) : null}
    </div>
  )
}

export default LandingPage
