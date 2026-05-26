import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { buildBackendUrl, normalizeApiBaseUrl } from '../utils/apiUrl'

const initialAuthState = {
  status: 'loading',
  user: null,
  error: '',
}

const initialRepositoriesState = {
  status: 'idle',
  repositories: [],
  error: '',
}

const REPOSITORY_CACHE_KEY = 'repoguard.repositories.v1'
const DROPDOWN_OPEN_CARET = '\u25B2'
const DROPDOWN_CLOSED_CARET = '\u25BC'

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
    // Ignore storage failures to keep runtime resilient.
  }
}

function RepositoryListPage() {
  const navigate = useNavigate()
  const rawApiBaseUrl = import.meta.env.VITE_API_URL
  const apiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(rawApiBaseUrl),
    [rawApiBaseUrl],
  )

  const authMeUrl = useMemo(() => {
    if (!apiBaseUrl) {
      return null
    }
    return buildBackendUrl(apiBaseUrl, '/auth/me')
  }, [apiBaseUrl])

  const repositoriesUrl = useMemo(() => {
    if (!apiBaseUrl) {
      return null
    }
    return buildBackendUrl(apiBaseUrl, '/repositories')
  }, [apiBaseUrl])

  const [authState, setAuthState] = useState(initialAuthState)
  const [repositoriesState, setRepositoriesState] = useState(initialRepositoriesState)
  const [selectedRepositoryId, setSelectedRepositoryId] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const resetRepositoryData = useCallback(() => {
    setRepositoriesState(initialRepositoriesState)
    setSelectedRepositoryId('')
    setIsDropdownOpen(false)
  }, [])

  const loadSession = useCallback(async () => {
    if (!authMeUrl) {
      setAuthState({
        status: 'missing_config',
        user: null,
        error: '',
      })
      resetRepositoryData()
      return
    }

    setAuthState({
      status: 'loading',
      user: null,
      error: '',
    })

    try {
      const response = await fetch(authMeUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`auth_me_http_${response.status}`)
      }

      const payload = await response.json()
      if (payload?.authenticated && payload.user) {
        setAuthState({
          status: 'authenticated',
          user: payload.user,
          error: '',
        })
        return
      }

      setAuthState({
        status: 'unauthenticated',
        user: null,
        error: '',
      })
      resetRepositoryData()
    } catch {
      setAuthState({
        status: 'error',
        user: null,
        error:
          'Could not verify your GitHub session. Check backend availability and try again.',
      })
      resetRepositoryData()
    }
  }, [authMeUrl, resetRepositoryData])

  const loadRepositories = useCallback(async () => {
    if (!repositoriesUrl) {
      setRepositoriesState({
        status: 'error',
        repositories: [],
        error: 'Backend API URL is not configured for this environment.',
      })
      return
    }

    setRepositoriesState({
      status: 'loading',
      repositories: [],
      error: '',
    })

    try {
      const response = await fetch(repositoriesUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.status === 401) {
        setAuthState({
          status: 'unauthenticated',
          user: null,
          error: '',
        })
        resetRepositoryData()
        return
      }

      if (!response.ok) {
        throw new Error(`repositories_http_${response.status}`)
      }

      const payload = await response.json()
      const repositories = Array.isArray(payload?.repositories)
        ? payload.repositories
        : []

      if (!repositories.length) {
        setRepositoriesState({
          status: 'empty',
          repositories: [],
          error: '',
        })
        writeJsonStorage(REPOSITORY_CACHE_KEY, [])
        return
      }

      setRepositoriesState({
        status: 'success',
        repositories,
        error: '',
      })
      writeJsonStorage(REPOSITORY_CACHE_KEY, repositories)
    } catch {
      const cachedRepositories = readJsonStorage(REPOSITORY_CACHE_KEY, [])
      if (Array.isArray(cachedRepositories) && cachedRepositories.length) {
        setRepositoriesState({
          status: 'success',
          repositories: cachedRepositories,
          error: '',
        })
        return
      }

      setRepositoriesState({
        status: 'error',
        repositories: [],
        error:
          'Could not load repositories from backend. Confirm your backend session and retry.',
      })
    }
  }, [repositoriesUrl, resetRepositoryData])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  useEffect(() => {
    if (authState.status !== 'authenticated') {
      resetRepositoryData()
      return
    }

    void loadRepositories()
  }, [authState.status, loadRepositories, resetRepositoryData])

  useEffect(() => {
    if (repositoriesState.status !== 'success') {
      return
    }

    const hasSelectedRepository = repositoriesState.repositories.some(
      (repository) => String(repository.id) === selectedRepositoryId,
    )

    if (!hasSelectedRepository) {
      const firstRepository = repositoriesState.repositories[0]
      setSelectedRepositoryId(firstRepository ? String(firstRepository.id) : '')
    }
  }, [repositoriesState, selectedRepositoryId])

  useEffect(() => {
    if (!isDropdownOpen) {
      return
    }

    function handleOutsideClick(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isDropdownOpen])

  const isAuthenticated = authState.status === 'authenticated' && authState.user
  const isLoadingSession = authState.status === 'loading'
  const isUnauthenticated = authState.status === 'unauthenticated'
  const isMissingConfig = authState.status === 'missing_config'
  const hasSessionError = authState.status === 'error'

  const repositoriesLoaded = repositoriesState.status === 'success'
  const repositoriesEmpty = repositoriesState.status === 'empty'
  const repositoriesError = repositoriesState.status === 'error'
  const repositoriesLoading = repositoriesState.status === 'loading'
  const repositories = repositoriesLoaded ? repositoriesState.repositories : []

  const selectedRepository = repositories.find(
    (repository) => String(repository.id) === selectedRepositoryId,
  )
  const canInspectRepository = Boolean(selectedRepository)

  const handleInspectRepository = () => {
    if (!selectedRepository) {
      return
    }
    navigate(`/repositories/${selectedRepository.id}`)
  }

  const handleToggleDropdown = () => {
    if (!repositoriesLoaded || !repositories.length) {
      return
    }
    setIsDropdownOpen((current) => !current)
  }

  const handleSelectRepository = (repositoryId) => {
    setSelectedRepositoryId(String(repositoryId))
    setIsDropdownOpen(false)
  }

  return (
    <div className="page repository-selector-page">
      {isLoadingSession ? (
        <Card title="Checking GitHub session" subtitle="Contacting backend /auth/me">
          <p className="state-note">
            Verifying authentication before loading your repositories...
          </p>
        </Card>
      ) : null}

      {isMissingConfig ? (
        <Card title="Missing API configuration" subtitle="Set VITE_API_URL for this environment">
          <p className="state-note state-note-danger">
            Backend API URL is not configured for this environment.
          </p>
        </Card>
      ) : null}

      {hasSessionError ? (
        <Card title="Could not validate session" subtitle="Backend request failed">
          <p className="state-note state-note-danger">{authState.error}</p>
        </Card>
      ) : null}

      {isUnauthenticated ? (
        <Card title="Not connected to GitHub" subtitle="Authentication required">
          <p className="state-note">
            Your current session is not authenticated. Return to onboarding and try
            connecting with GitHub again.
          </p>
          <div className="hero-actions">
            <Button to="/">Back to onboarding</Button>
          </div>
        </Card>
      ) : null}

      {isAuthenticated ? (
        <>
          <div className="page-topbar">
            <p className="page-topbar-brand">RepoGuard</p>
            <p className="page-topbar-user">@{authState.user.login} connected</p>
          </div>

          <section className="repository-selector-shell">
            <Card className="repository-selector-card">
              <div className="repository-selector-content">
                <h1>Choose a repository</h1>
                <p className="page-description">
                  Select one GitHub project to generate a focused report.
                </p>

                {repositoriesLoading ? (
                  <p className="state-note selector-state-note">Loading repositories from GitHub...</p>
                ) : null}

                {repositoriesError ? (
                  <p className="state-note state-note-danger selector-state-note">
                    {repositoriesState.error}
                  </p>
                ) : null}

                {repositoriesEmpty ? (
                  <p className="state-note selector-state-note">
                    No public repositories were returned for this account.
                  </p>
                ) : null}

                {repositoriesLoaded ? (
                  <div className="repository-dropdown" ref={dropdownRef}>
                    <button
                      type="button"
                      className={`repository-dropdown-trigger ${isDropdownOpen ? 'repository-dropdown-trigger-open' : ''}`.trim()}
                      onClick={handleToggleDropdown}
                      aria-haspopup="listbox"
                      aria-expanded={isDropdownOpen}
                      aria-controls="repository-selector-listbox"
                    >
                      <span className="repository-dropdown-selected">
                        {selectedRepository ? selectedRepository.fullName : 'Select repository'}
                      </span>
                      <span className="repository-dropdown-caret" aria-hidden="true">
                        {isDropdownOpen ? DROPDOWN_OPEN_CARET : DROPDOWN_CLOSED_CARET}
                      </span>
                    </button>

                    {isDropdownOpen ? (
                      <ul
                        id="repository-selector-listbox"
                        className="repository-dropdown-menu"
                        role="listbox"
                        aria-label="GitHub repositories"
                      >
                        {repositories.map((repository) => {
                          const isSelected = String(repository.id) === selectedRepositoryId
                          return (
                            <li
                              key={repository.id}
                              role="option"
                              aria-selected={isSelected}
                              className={isSelected ? 'repository-option-selected' : ''}
                            >
                              <button
                                type="button"
                                className="repository-option-button"
                                onClick={() => handleSelectRepository(repository.id)}
                              >
                                {repository.fullName}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <div className="repository-selector-actions">
                  <Button
                    type="button"
                    onClick={handleInspectRepository}
                    disabled={!canInspectRepository}
                    className="repository-selector-inspect-button"
                  >
                    Inspect repository
                  </Button>
                </div>

                <p className="repository-selector-support">
                  RepoGuard checks repository health, maintainability and defensive security
                  signals.
                </p>
              </div>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  )
}

export default RepositoryListPage
