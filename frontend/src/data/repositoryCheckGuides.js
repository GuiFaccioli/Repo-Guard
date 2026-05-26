export const REPOSITORY_CHECK_GUIDES = [
  {
    id: 'readme',
    label: 'README',
    shortDescription: 'Project purpose and usage summary.',
    fixTitle: 'Keep README clear and updated',
    whatItIs:
      'README is the main entry point for developers who need to understand what this repository does.',
    whyChecked:
      'RepoGuard checks README to confirm the project has a basic documentation foundation.',
    whyMatters:
      'A clear README reduces onboarding friction and helps contributors make safer changes.',
    howToFix: [
      'Add a concise project overview and key goals.',
      'Document setup steps, run commands, and environment expectations.',
      'Keep examples and usage notes synchronized with the current codebase.',
    ],
  },
  {
    id: 'gitignore',
    label: '.gitignore',
    shortDescription: 'Version-control exclusion rules.',
    fixTitle: 'Maintain .gitignore coverage',
    whatItIs:
      '.gitignore defines which generated, temporary, or sensitive files should not be committed.',
    whyChecked:
      'RepoGuard checks .gitignore because missing exclusions can leak local artifacts into commits.',
    whyMatters:
      'Good ignore rules keep history clean and reduce accidental exposure of sensitive local files.',
    howToFix: [
      'Start from a language/framework baseline ignore file.',
      'Include local cache, build output, and IDE-specific folders.',
      'Review ignore patterns when tooling changes.',
    ],
  },
  {
    id: 'package-json',
    label: 'package.json',
    shortDescription: 'Node project manifest and scripts.',
    fixTitle: 'Add or complete package.json',
    whatItIs:
      'package.json defines project metadata, dependencies, and scripts for JavaScript/Node workflows.',
    whyChecked:
      'RepoGuard checks package.json to confirm dependency and script management exists.',
    whyMatters:
      'Without a valid manifest, reproducible installs and automation become inconsistent.',
    howToFix: [
      'Create package.json with project name, version, and scripts.',
      'Declare runtime and development dependencies explicitly.',
      'Keep scripts aligned with the actual build and test commands.',
    ],
  },
  {
    id: 'dependabot',
    label: 'Dependabot',
    shortDescription: 'Automated dependency update checks.',
    fixTitle: 'Add Dependabot configuration',
    whatItIs:
      'Dependabot is a GitHub service that proposes dependency update pull requests on a schedule.',
    whyChecked:
      'RepoGuard checks Dependabot to verify the repository has automated dependency maintenance signals.',
    whyMatters:
      'Regular updates reduce the time known vulnerabilities and outdated packages remain in production.',
    howToFix: [
      'Create .github/dependabot.yml in the default branch.',
      'Configure update frequency for each package ecosystem in use.',
      'Review and merge update pull requests with normal CI checks.',
    ],
  },
  {
    id: 'github-actions',
    label: 'GitHub Actions',
    shortDescription: 'Repository workflow automation.',
    fixTitle: 'Add a GitHub Actions workflow',
    whatItIs:
      'GitHub Actions runs workflows for build, test, and validation tasks directly in GitHub.',
    whyChecked:
      'RepoGuard checks for workflows to confirm basic automation is present.',
    whyMatters:
      'Automation catches regressions earlier and enforces repeatable quality checks.',
    howToFix: [
      'Add at least one workflow in .github/workflows.',
      'Trigger it on push and pull_request for the main branch.',
      'Start with a small build/test pipeline and expand progressively.',
    ],
  },
  {
    id: 'license',
    label: 'LICENSE',
    shortDescription: 'Project usage permissions.',
    fixTitle: 'Add a LICENSE file',
    whatItIs:
      'A LICENSE file defines how other people can use, modify, and distribute your project.',
    whyChecked:
      'RepoGuard checks for a license to ensure repository usage terms are explicit.',
    whyMatters:
      'Missing licensing creates legal ambiguity for users and contributors.',
    howToFix: [
      'Choose a license aligned with project goals.',
      'Add a LICENSE file at the repository root.',
      'Mention the chosen license briefly in README.',
    ],
  },
  {
    id: 'recent-activity',
    label: 'Recent activity',
    shortDescription: 'Repository maintenance recency.',
    fixTitle: 'Keep a maintenance cadence',
    whatItIs:
      'Recent activity indicates whether the repository is actively maintained.',
    whyChecked:
      'RepoGuard checks activity to identify maintenance drift and stale projects.',
    whyMatters:
      'Long inactivity can increase technical debt and unresolved security exposure.',
    howToFix: [
      'Review open backlog regularly and prioritize maintenance tasks.',
      'Keep dependency and tooling updates in a predictable cadence.',
      'Document maintenance expectations for collaborators.',
    ],
  },
  {
    id: 'open-issues',
    label: 'Open issues',
    shortDescription: 'Issue tracking visibility.',
    fixTitle: 'Keep issue triage active',
    whatItIs:
      'Open issues represent known bugs, requests, and unresolved engineering work.',
    whyChecked:
      'RepoGuard checks issue visibility as part of repository health signals.',
    whyMatters:
      'Issue triage provides transparency and helps avoid silent quality decline.',
    howToFix: [
      'Define a basic triage process and ownership expectations.',
      'Label and prioritize issues to clarify urgency.',
      'Close resolved issues to keep the board actionable.',
    ],
  },
  {
    id: 'open-pull-requests',
    label: 'Open pull requests',
    shortDescription: 'Change review throughput.',
    fixTitle: 'Maintain pull request review flow',
    whatItIs:
      'Open pull requests show work in progress waiting for review or merge.',
    whyChecked:
      'RepoGuard checks open pull requests to observe collaboration and review flow.',
    whyMatters:
      'Stalled pull requests can hide unfinished fixes and increase merge risk over time.',
    howToFix: [
      'Review pending pull requests on a regular schedule.',
      'Request targeted reviewers and keep CI passing.',
      'Merge or close stale pull requests with clear notes.',
    ],
  },
]

const checkAliasMap = {
  readme: 'readme',
  gitignore: 'gitignore',
  packagejson: 'package-json',
  dependabot: 'dependabot',
  githubactions: 'github-actions',
  actionsworkflow: 'github-actions',
  license: 'license',
  recentactivity: 'recent-activity',
  openissues: 'open-issues',
  issuesopen: 'open-issues',
  openpullrequests: 'open-pull-requests',
  pullrequestsopen: 'open-pull-requests',
  pullrequests: 'open-pull-requests',
}

function normalizeRawCheckToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function resolveRepositoryCheckId(check) {
  const directId = checkAliasMap[normalizeRawCheckToken(check?.key)]
  if (directId) {
    return directId
  }

  const labelId = checkAliasMap[normalizeRawCheckToken(check?.label)]
  if (labelId) {
    return labelId
  }

  return null
}

export function getRepositoryCheckGuideById(checkId) {
  return REPOSITORY_CHECK_GUIDES.find((item) => item.id === checkId) || null
}

export function buildOrderedRepositoryChecks(scanChecks) {
  const mappedChecks = new Map()

  for (const check of scanChecks || []) {
    const normalizedId = resolveRepositoryCheckId(check)
    if (!normalizedId || mappedChecks.has(normalizedId)) {
      continue
    }

    mappedChecks.set(normalizedId, {
      id: normalizedId,
      label: check.label,
      passed: Boolean(check.passed),
      rawKey: check.key,
    })
  }

  return REPOSITORY_CHECK_GUIDES.map((definition) => {
    const mappedCheck = mappedChecks.get(definition.id)

    return {
      id: definition.id,
      label: definition.label,
      passed: mappedCheck ? mappedCheck.passed : false,
      fixTitle: definition.fixTitle,
      guide: definition,
    }
  })
}
