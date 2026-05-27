import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  CODE_SAFETY_CHECK_IDS,
  getRepositoryCheckGuideById,
  resolveRepositoryCheckId,
} from '../data/repositoryCheckGuides'
import {
  trackLearnMoreOpened,
  trackLearnWhyThisMattersOpened,
  trackScanCompleted,
  trackScanFailed,
  trackScanStarted,
  trackWhatsWrongOpened,
} from '../lib/analytics'
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

const HIDDEN_REPOSITORY_HEALTH_CHECK_IDS = new Set([
  'recent-activity',
  'open-issues',
  'open-pull-requests',
])

const PRIORITY_REPOSITORY_HEALTH_CHECK_IDS = new Set(['dependabot'])

const SAFE_SCAN_EVIDENCE_CACHE_KEY = 'repoguard.safeScanEvidence.v1'
const GENERAL_SCAN_ANALYTICS_TYPE = 'general'
const DIDACTIC_STATUS_LABEL = {
  pass: '✓ Green',
  fail: '✕ Red',
}

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

function writeJsonLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage write failures to keep scan rendering stable.
  }
}

function normalizeCodeContext(codeContextInput) {
  if (!Array.isArray(codeContextInput)) {
    return null
  }

  const normalizedContext = codeContextInput
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

  return normalizedContext.length ? normalizedContext : null
}

function normalizePositiveLineNumber(value) {
  return Number.isFinite(value) && Number(value) > 0
    ? Math.floor(Number(value))
    : null
}

function normalizeBoundedString(value, maxLength) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : null
}

function normalizePointerString(value) {
  return typeof value === 'string' && value.trim()
    ? value.trimEnd().slice(0, 100)
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

function buildSafeEvidenceFromFinding(finding, checkId) {
  return {
    checklist: 'security_basics',
    checkId,
    label: typeof finding?.title === 'string' ? finding.title : '',
    status: finding?.status === 'pass' ? 'pass' : 'fail',
    details: typeof finding?.summary === 'string' ? finding.summary : '',
    filePath: normalizeBoundedString(finding?.filePath, 300),
    lineNumber: normalizePositiveLineNumber(finding?.lineNumber),
    codeExcerpt: normalizeBoundedString(finding?.safeExcerpt, 220),
    codeContext: normalizeCodeContext(finding?.codeContext),
    flaggedLineNumber: normalizePositiveLineNumber(finding?.flaggedLineNumber),
    flaggedLinePointer: normalizePointerString(finding?.flaggedLinePointer),
    flaggedLineExplanation: normalizeBoundedString(finding?.flaggedLineExplanation, 220),
    githubFileUrl: normalizeGithubEvidenceUrl(finding?.githubFileUrl),
    githubFolderUrl: normalizeGithubEvidenceUrl(finding?.githubFolderUrl),
  }
}

function buildSafeEvidenceFromItem(item, checkId) {
  return {
    checklist: 'security_basics',
    checkId,
    label: typeof item?.label === 'string' ? item.label : '',
    status: item?.status === 'pass' ? 'pass' : 'fail',
    details: typeof item?.details === 'string' ? item.details : '',
    filePath: normalizeBoundedString(item?.filePath, 300),
    lineNumber: normalizePositiveLineNumber(item?.lineNumber),
    codeExcerpt: normalizeBoundedString(item?.codeExcerpt, 220),
    codeContext: normalizeCodeContext(item?.codeContext),
    flaggedLineNumber: normalizePositiveLineNumber(item?.flaggedLineNumber),
    flaggedLinePointer: normalizePointerString(item?.flaggedLinePointer),
    flaggedLineExplanation: normalizeBoundedString(item?.flaggedLineExplanation, 220),
    githubFileUrl: normalizeGithubEvidenceUrl(item?.githubFileUrl),
    githubFolderUrl: normalizeGithubEvidenceUrl(item?.githubFolderUrl),
  }
}

function buildCodeSafetyEvidenceByCheckId(scanResult) {
  const codeSafetyEvidence = {}
  if (!scanResult || typeof scanResult !== 'object') {
    return codeSafetyEvidence
  }

  const evidencePacketFindings = Array.isArray(scanResult?.evidencePacket?.findings)
    ? scanResult.evidencePacket.findings
    : []

  for (const finding of evidencePacketFindings) {
    const directCheckId =
      typeof finding?.checkId === 'string' ? finding.checkId.trim() : ''
    const resolvedCheckId =
      directCheckId && CODE_SAFETY_CHECK_IDS.has(directCheckId)
        ? directCheckId
        : resolveRepositoryCheckId({
            label: finding?.title,
          })

    if (!resolvedCheckId || !CODE_SAFETY_CHECK_IDS.has(resolvedCheckId)) {
      continue
    }

    codeSafetyEvidence[resolvedCheckId] = buildSafeEvidenceFromFinding(
      finding,
      resolvedCheckId,
    )
  }

  const resultGroups = Array.isArray(scanResult.results) ? scanResult.results : []
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

      if (codeSafetyEvidence[resolvedCheckId]) {
        continue
      }

      codeSafetyEvidence[resolvedCheckId] = buildSafeEvidenceFromItem(
        item,
        resolvedCheckId,
      )
    }
  }

  return codeSafetyEvidence
}

function buildDidacticSources(checkId) {
  const guide = getRepositoryCheckGuideById(checkId)
  const docs = Array.isArray(guide?.officialDocs) ? guide.officialDocs : []

  if (!docs.length) {
    return []
  }

  return docs.slice(0, 3).map((doc) => ({
    title: doc.label,
    url: doc.url,
    sourceType: /owasp|mdn/i.test(doc.label) ? 'community' : 'official',
  }))
}

function buildDidacticCopy(checkId, item) {
  const guide = getRepositoryCheckGuideById(checkId)
  const action = Array.isArray(guide?.howToFix) && guide.howToFix.length ? guide.howToFix[0] : 'Review this check and apply the recommended fix.'

  return {
    whatChecked: `RepoGuard checked "${item?.label || checkId}" for this repository.`,
    whyItMatters: guide?.whyMatters || guide?.whyChecked || 'This signal helps keep repository quality and security understandable.',
    whatFound: typeof item?.details === 'string' ? item.details : 'No additional details were returned.',
    suggestedAction: action,
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

function normalizeRepositoryVisibility(repository) {
  if (repository?.private === true || repository?.isPrivate === true) {
    return 'private'
  }

  if (repository?.private === false || repository?.isPrivate === false) {
    return 'public'
  }

  if (typeof repository?.visibility !== 'string') {
    return null
  }

  const normalizedVisibility = repository.visibility.trim().toLowerCase()
  return ['public', 'private', 'internal'].includes(normalizedVisibility)
    ? normalizedVisibility
    : null
}

function buildRepositoryAnalyticsParams(repository) {
  const repositoryVisibility = normalizeRepositoryVisibility(repository)
  const repositoryIsPublic = repositoryVisibility === 'public'
  const repositoryOwner = normalizeBoundedString(repository?.owner, 120)
  const repositoryName = normalizeBoundedString(repository?.name, 120)

  return {
    ...(repositoryIsPublic && repositoryOwner ? { repository_owner: repositoryOwner } : {}),
    ...(repositoryIsPublic && repositoryName ? { repository_name: repositoryName } : {}),
    ...(repositoryVisibility ? { repository_visibility: repositoryVisibility } : {}),
  }
}

function buildScanFailedReason(statusCode) {
  if (statusCode === 401) {
    return 'unauthenticated'
  }

  if (statusCode >= 400) {
    return 'request_failed'
  }

  return 'unknown'
}

function buildFailedCheckCounts(scanResult) {
  const groups = Array.isArray(scanResult?.results) ? scanResult.results : []
  let failedCheckCount = 0
  let codeSafetyFailedCount = 0
  let repositoryHealthFailedCount = 0

  for (const group of groups) {
    const items = Array.isArray(group?.items) ? group.items : []
    for (const item of items) {
      if (item?.status !== 'fail') {
        continue
      }

      failedCheckCount += 1

      if (group?.checklist === 'security_basics') {
        codeSafetyFailedCount += 1
        continue
      }

      repositoryHealthFailedCount += 1
    }
  }

  return {
    failed_check_count: failedCheckCount,
    code_safety_failed_count: codeSafetyFailedCount,
    repository_health_failed_count: repositoryHealthFailedCount,
  }
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

  const latestCodeSafetyEvidenceByCheckId = useMemo(
    () => buildCodeSafetyEvidenceByCheckId(scanState.result),
    [scanState.result],
  )

  useEffect(() => {
    if (scanState.status !== 'success' || !scanState.result) {
      return
    }

    const repositoryEvidenceChecks = latestCodeSafetyEvidenceByCheckId
    const previousCache =
      readJsonLocalStorage(SAFE_SCAN_EVIDENCE_CACHE_KEY, null) ||
      readJsonStorage(SAFE_SCAN_EVIDENCE_CACHE_KEY, {})
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
    writeJsonLocalStorage(SAFE_SCAN_EVIDENCE_CACHE_KEY, nextCache)
  }, [
    latestCodeSafetyEvidenceByCheckId,
    repositoryFullName,
    routeRepositoryId,
    scanState.result,
    scanState.status,
  ])

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

    const startRepositoryParams = buildRepositoryAnalyticsParams(repositoryTarget)
    trackScanStarted({
      ...startRepositoryParams,
      scan_type: GENERAL_SCAN_ANALYTICS_TYPE,
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
        trackScanFailed({
          ...startRepositoryParams,
          scan_type: GENERAL_SCAN_ANALYTICS_TYPE,
          error_reason: buildScanFailedReason(response.status),
        })
        return
      }

      const payload = await response.json()
      setScanState({
        status: 'success',
        result: payload,
        error: '',
      })
      const completedRepositoryParams = buildRepositoryAnalyticsParams(
        payload?.repository || repositoryTarget,
      )
      trackScanCompleted({
        ...completedRepositoryParams,
        scan_type: GENERAL_SCAN_ANALYTICS_TYPE,
        ...buildFailedCheckCounts(payload),
      })
    } catch {
      setScanState({
        status: 'error',
        result: null,
        error: buildScanErrorMessage(500),
      })
      trackScanFailed({
        ...startRepositoryParams,
        scan_type: GENERAL_SCAN_ANALYTICS_TYPE,
        error_reason: 'network_error',
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

  const handleGuideLinkClick = ({ checkId, checkCategory, isPassed }) => {
    const repositoryParams = buildRepositoryAnalyticsParams(
      scannedRepository || repositoryTarget,
    )
    const eventParams = {
      ...repositoryParams,
      check_id: checkId,
      check_category: checkCategory,
    }

    if (checkCategory === 'code_safety' && !isPassed) {
      trackWhatsWrongOpened(eventParams)
      return
    }

    if (isPassed) {
      trackLearnWhyThisMattersOpened(eventParams)
      return
    }

    trackLearnMoreOpened(eventParams)
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
            ? scanState.result.results.map((group) => {
                const visibleGroupItems = Array.isArray(group.items)
                  ? group.items.filter((item) => {
                      if (group.checklist !== 'good_practices') {
                        return true
                      }

                      const itemCheckId = resolveRepositoryCheckId({
                        label: item?.label,
                      })

                      return itemCheckId
                        ? !HIDDEN_REPOSITORY_HEALTH_CHECK_IDS.has(itemCheckId)
                        : true
                    })
                  : []

                return (
                  <Card key={group.checklist} className="scan-result-card" title={group.title}>
                    <ul className="scan-result-list">
                      {visibleGroupItems.map((item) => {
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
                        const safeCodeEvidence = isCodeSafetySignal
                          ? latestCodeSafetyEvidenceByCheckId[checkId] || null
                          : null
                        const displayFilePath =
                          safeCodeEvidence?.filePath ||
                          normalizeBoundedString(item?.filePath, 300)
                        const displayLineNumber =
                          safeCodeEvidence?.lineNumber ||
                          normalizePositiveLineNumber(item?.lineNumber)
                        const displayCodeExcerpt =
                          safeCodeEvidence?.codeExcerpt ||
                          normalizeBoundedString(item?.codeExcerpt, 220)
                        const displayCodeContext =
                          safeCodeEvidence?.codeContext ||
                          normalizeCodeContext(item?.codeContext)
                        const displayFlaggedLineNumber =
                          safeCodeEvidence?.flaggedLineNumber ||
                          normalizePositiveLineNumber(item?.flaggedLineNumber)
                        const displayFlaggedLinePointer =
                          safeCodeEvidence?.flaggedLinePointer ||
                          normalizePointerString(item?.flaggedLinePointer)
                        const displayFlaggedLineExplanation =
                          safeCodeEvidence?.flaggedLineExplanation ||
                          normalizeBoundedString(item?.flaggedLineExplanation, 220)
                        const displayGithubFileUrl =
                          safeCodeEvidence?.githubFileUrl ||
                          normalizeGithubEvidenceUrl(item?.githubFileUrl)
                        const displayGithubFolderUrl =
                          safeCodeEvidence?.githubFolderUrl ||
                          normalizeGithubEvidenceUrl(item?.githubFolderUrl)
                        const isPriorityCheck =
                          !isCodeSafetySignal &&
                          (PRIORITY_REPOSITORY_HEALTH_CHECK_IDS.has(checkId) ||
                            /dependabot|dependency automation/i.test(String(item.label || '')))
                        const didacticCopy = buildDidacticCopy(checkId, item)
                        const didacticSources = buildDidacticSources(checkId)
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
                                <span className="scan-result-priority">{DIDACTIC_STATUS_LABEL[item.status] || item.status}</span>
                                {isPriorityCheck ? (
                                  <span className="scan-result-priority">Priority</span>
                                ) : null}
                              </p>
                              {displayFilePath ? (
                                <p className="scan-result-file">
                                  File: <span className="scan-result-file-path">{displayFilePath}</span>
                                </p>
                              ) : null}
                              <p className="scan-result-details"><strong>What was checked:</strong> {didacticCopy.whatChecked}</p>
                              <p className="scan-result-details"><strong>Why it matters:</strong> {didacticCopy.whyItMatters}</p>
                              <p className="scan-result-details"><strong>What RepoGuard found:</strong> {didacticCopy.whatFound}</p>
                              <p className="scan-result-details"><strong>Suggested action:</strong> {didacticCopy.suggestedAction}</p>
                              {didacticSources.length ? (
                                <ul className="report-line-list">
                                  {didacticSources.map((source) => (
                                    <li key={`${checkId}-${source.url}`}>
                                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                                        {source.title}
                                      </a>{' '}
                                      ({source.sourceType})
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                              <Link
                                className="scan-result-learn-more"
                                to={`/repositories/${routeRepositoryId}/checks/${checkId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  handleGuideLinkClick({
                                    checkId,
                                    checkCategory: isCodeSafetySignal
                                      ? 'code_safety'
                                      : 'repository_health',
                                    isPassed,
                                  })
                                }
                                state={{
                                  repositoryFullName,
                                  checklistId: group.checklist,
                                  checkStatus: safeCodeEvidence?.status || item.status,
                                  checkLabel: item.label,
                                  details:
                                    safeCodeEvidence?.details ||
                                    (typeof item.details === 'string' ? item.details : ''),
                                  filePath: displayFilePath,
                                  lineNumber: displayLineNumber,
                                  codeExcerpt: displayCodeExcerpt,
                                  codeContext: displayCodeContext,
                                  flaggedLineNumber: displayFlaggedLineNumber,
                                  flaggedLinePointer: displayFlaggedLinePointer,
                                  flaggedLineExplanation: displayFlaggedLineExplanation,
                                  githubFileUrl: displayGithubFileUrl,
                                  githubFolderUrl: displayGithubFolderUrl,
                                }}
                              >
                                {learnMoreLabel}
                              </Link>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </Card>
                )
              })
            : null}
        </section>
      ) : null}
    </div>
  )
}

export default LandingPage
