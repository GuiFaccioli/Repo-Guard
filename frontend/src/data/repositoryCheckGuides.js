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

const ADDITIONAL_REPOSITORY_CHECK_GUIDES = [
  {
    id: 'hardcoded-secret',
    label: 'Possible hardcoded secret',
    shortDescription: 'Secret-like values assigned directly in source code.',
    fixTitle: 'Move secrets out of source code',
    whatRepoGuardFound:
      'RepoGuard found a secret-like assignment pattern in sampled source code.',
    whatItIs:
      'A hardcoded secret is a credential or token value written directly into application code.',
    whyChecked:
      'RepoGuard checks obvious secret assignment patterns because committed credentials are a frequent accidental exposure source.',
    whyNeedsAttention:
      'Credentials in source history can be copied or reused later, even if they are removed in a newer commit.',
    whyMatters:
      'Secrets in source control can be copied, leaked, and reused long after a commit is made.',
    saferDirection:
      'Prefer environment variables or a dedicated secrets manager so sensitive values stay outside the repository.',
    saferExample: 'const apiKey = process.env.API_KEY;',
    currentPattern: 'const apiKey = "sk_live_********";',
    recommendedPattern: 'const apiKey = process.env.API_KEY;',
    whatIsWrongHere:
      'Secrets should not live directly in source code because they can be copied from repository history and reused outside controlled environments.',
    officialDocs: [
      {
        label: 'GitHub: About secret scanning',
        url: 'https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning',
      },
      {
        label: 'GitHub: Using secrets in GitHub Actions',
        url: 'https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions',
      },
      {
        label: 'OWASP: Secrets Management Cheat Sheet',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html',
      },
    ],
    howToFix: [
      'Replace hardcoded values with environment variables or a secrets manager.',
      'Rotate any credential that may already be exposed.',
      'Document safe local setup so contributors avoid placing secrets in code.',
      'Safe example: const apiKey = process.env.API_KEY;',
    ],
  },
  {
    id: 'committed-env-file',
    label: 'Environment file committed',
    shortDescription: 'Environment files tracked in the repository tree.',
    fixTitle: 'Keep .env files out of version control',
    whatRepoGuardFound:
      'RepoGuard found an environment file path committed in the repository tree.',
    whatItIs:
      'Environment files such as .env can contain API keys, tokens, and private runtime configuration.',
    whyChecked:
      'RepoGuard checks for committed .env files because they often include sensitive project secrets.',
    whyNeedsAttention:
      'Committed environment files can expose operational settings and expand incident-response scope.',
    whyMatters:
      'A committed environment file can expose credentials and increase incident response scope.',
    saferDirection:
      'Keep runtime secrets in deployment configuration and commit only a safe template file such as .env.example.',
    saferExample: '.env.example\nAPI_KEY=your_api_key_here',
    currentPattern: '.env file detected. Content intentionally hidden.',
    recommendedPattern:
      '.gitignore\n.env\n.env.local\n\n.env.example\nAPI_KEY=your_api_key_here',
    whatIsWrongHere:
      'Environment files often contain credentials and private runtime values, so keeping them in version control increases exposure risk.',
    officialDocs: [
      {
        label: 'GitHub: Ignoring files',
        url: 'https://docs.github.com/en/get-started/git-basics/ignoring-files',
      },
      {
        label: 'GitHub: Removing sensitive data from a repository',
        url: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository',
      },
      {
        label: 'OWASP: Secrets Management Cheat Sheet',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html',
      },
    ],
    howToFix: [
      'Remove environment files from version control and rotate exposed values.',
      'Store runtime configuration in deployment environment variables or a secret manager.',
      'Add .env patterns to .gitignore and keep a safe .env.example template.',
      'Safe example: keep only .env.example with placeholder names, not real secrets.',
    ],
  },
  {
    id: 'sql-string-concatenation',
    label: 'SQL query built with string concatenation',
    shortDescription: 'SQL query text composed with dynamic string content.',
    fixTitle: 'Use parameterized SQL queries',
    whatRepoGuardFound:
      'RepoGuard found a SQL statement built through dynamic string operations.',
    whatItIs:
      'String-concatenated SQL builds query text with dynamic values instead of parameter binding.',
    whyChecked:
      'RepoGuard checks this pattern because dynamic query strings are hard to review and can be unsafe with user-controlled input.',
    whyNeedsAttention:
      'Dynamic SQL strings are harder to validate and maintain safely when input values are mixed into command text.',
    whyMatters:
      'Parameterized queries are safer and reduce injection risk while keeping data access code easier to maintain.',
    saferDirection:
      'Prefer parameterized queries so values are handled separately from SQL command text.',
    saferExample:
      'const query = "SELECT * FROM users WHERE email = ?";\ndb.query(query, [email]);',
    currentPattern:
      "const query = `SELECT * FROM users WHERE email = '${email}'`;",
    recommendedPattern:
      'const query = "SELECT * FROM users WHERE email = ?";\ndb.query(query, [email]);',
    whatIsWrongHere:
      'Building SQL with dynamic string content mixes command text with input values and makes query handling harder to review safely.',
    officialDocs: [
      {
        label: 'OWASP: SQL Injection Prevention Cheat Sheet',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
      },
      {
        label: 'node-postgres: Parameterized queries',
        url: 'https://node-postgres.com/features/queries',
      },
      {
        label: 'Prisma: Raw query guidance',
        url: 'https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries',
      },
    ],
    howToFix: [
      'Use prepared statements or query parameter binding in your database library.',
      'Avoid building SQL command strings with + or template interpolation.',
      'Keep SQL construction centralized so it is easier to audit.',
      'Safe example: db.query("SELECT * FROM users WHERE id = ?", [userId]);',
    ],
  },
  {
    id: 'eval-usage',
    label: 'No eval usage detected',
    shortDescription: 'Dynamic code execution calls such as eval() and new Function().',
    fixTitle: 'Avoid dynamic code execution patterns',
    whatRepoGuardFound:
      'RepoGuard found a dynamic code execution pattern such as eval() or new Function().',
    whatItIs:
      'eval() and new Function() execute code from strings at runtime.',
    whyChecked:
      'RepoGuard checks for dynamic execution because it can make behavior unpredictable and harder to secure.',
    whyNeedsAttention:
      'Dynamic execution patterns can make runtime behavior harder to reason about and harder to review safely.',
    whyMatters:
      'Dynamic execution can turn unsafe input into executable logic and complicate code review.',
    saferDirection:
      'Prefer explicit control flow with named functions or handler maps instead of executing strings as code.',
    saferExample: 'const handler = handlers[action] ?? defaultHandler;\nhandler(payload);',
    currentPattern: 'eval(userInput);',
    recommendedPattern:
      'const actions = { start: startProcess, stop: stopProcess };\nactions[userAction]?.();',
    whatIsWrongHere:
      'Dynamic code execution makes runtime behavior harder to predict and can turn unsafe input into executable logic.',
    officialDocs: [
      {
        label: 'MDN: eval()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval',
      },
      {
        label: 'MDN: Function constructor',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function',
      },
    ],
    howToFix: [
      'Replace eval-style usage with explicit functions, parsers, or lookup maps.',
      'Use structured configuration instead of executable string snippets.',
      'Validate untrusted input before it influences control flow.',
      'Safe example: const handler = handlers[action] ?? defaultHandler;',
    ],
  },
  {
    id: 'permissive-cors',
    label: 'Permissive CORS configuration',
    shortDescription: 'CORS settings that may allow broad cross-origin access.',
    fixTitle: 'Restrict CORS to trusted origins',
    whatRepoGuardFound:
      'RepoGuard found a CORS configuration that may allow broad cross-origin access.',
    whatItIs:
      'CORS controls which origins can call your API from browser contexts.',
    whyChecked:
      'RepoGuard checks permissive CORS patterns because wildcard or broad defaults may expose endpoints more widely than intended.',
    whyNeedsAttention:
      'Wide-open origins can be acceptable for some public APIs, but they should be reviewed when credentials, cookies, or private data are involved.',
    whyMatters:
      'Restricting origins reduces accidental cross-origin exposure and keeps browser access boundaries clearer.',
    saferDirection:
      'Prefer explicit allowed origins per environment and review credentials settings together with CORS rules.',
    saferExample:
      'app.use(cors({\n  origin: ["https://app.example.com"],\n  credentials: true,\n}));',
    currentPattern: 'app.use(cors({ origin: "*" }));',
    recommendedPattern:
      'app.use(cors({\n  origin: ["https://app.example.com"],\n  credentials: true,\n}));',
    whatIsWrongHere:
      'The current pattern may allow requests from any origin and should be reviewed when the API handles cookies, sessions, credentials, or private user data.',
    officialDocs: [
      {
        label: 'MDN: Cross-Origin Resource Sharing',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS',
      },
      {
        label: 'OWASP: Testing Cross Origin Resource Sharing',
        url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/07-Testing_Cross_Origin_Resource_Sharing',
      },
      {
        label: 'npm: cors middleware',
        url: 'https://www.npmjs.com/package/cors',
      },
    ],
    howToFix: [
      'Set explicit allowed origins for each environment instead of wildcard access.',
      'Review credential and cookie settings when enabling cross-origin requests.',
      'Keep CORS configuration centralized and documented for regular review.',
      'Safe example: app.use(cors({ origin: ["https://app.example.com"] }));',
    ],
  },
  {
    id: 'jwt-without-expiration',
    label: 'JWT token may be missing expiration',
    shortDescription: 'JWT signing call may not define an explicit expiration time.',
    fixTitle: 'Configure JWT expiration when signing tokens',
    whatRepoGuardFound:
      'RepoGuard found a JWT creation pattern that may need review.',
    whatItIs:
      'JSON Web Tokens (JWTs) are signed tokens often used for authentication and session flows.',
    whyChecked:
      'RepoGuard checks JWT signing patterns because tokens without visible expiration can remain valid longer than intended.',
    whyNeedsAttention:
      'A JWT without an explicit expiration may stay valid beyond the expected session lifetime.',
    whyMatters:
      'For authentication flows, tokens usually need a clear lifetime so access windows remain predictable and reviewable.',
    saferDirection:
      'Add an expiresIn option (or a clear exp claim) when creating JWTs.',
    saferExample:
      'const token = jwt.sign(payload, process.env.JWT_SECRET, {\n  expiresIn: "1h",\n});',
    currentPattern: 'const token = jwt.sign(payload, process.env.JWT_SECRET);',
    recommendedPattern:
      'const token = jwt.sign(payload, process.env.JWT_SECRET, {\n  expiresIn: "1h",\n});',
    whatIsWrongHere:
      'A JWT without an expiration may remain valid longer than intended. Tokens should usually have a clear lifetime, such as 15 minutes or 1 hour.',
    officialDocs: [
      {
        label: 'npm: jsonwebtoken documentation',
        url: 'https://www.npmjs.com/package/jsonwebtoken',
      },
      {
        label: 'Auth0: JSON Web Tokens',
        url: 'https://auth0.com/docs/secure/tokens/json-web-tokens',
      },
    ],
    howToFix: [
      'Add an expiresIn option when creating JWTs.',
      'Choose a lifetime based on session and security needs.',
      'Keep JWT secrets in environment variables.',
      'Safe example: const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });',
    ],
  },
]

export const CODE_SAFETY_CHECK_IDS = new Set([
  'hardcoded-secret',
  'committed-env-file',
  'sql-string-concatenation',
  'eval-usage',
  'permissive-cors',
  'jwt-without-expiration',
])

const checkAliasMap = {
  readme: 'readme',
  readmeexists: 'readme',
  gitignore: 'gitignore',
  gitignoreexists: 'gitignore',
  packagejson: 'package-json',
  packagemetadataispresent: 'package-json',
  dependabot: 'dependabot',
  dependencyautomationisconfigured: 'dependabot',
  githubactions: 'github-actions',
  actionsworkflow: 'github-actions',
  ciautomationisconfigured: 'github-actions',
  license: 'license',
  licensefileexists: 'license',
  recentactivity: 'recent-activity',
  openissues: 'open-issues',
  issuesopen: 'open-issues',
  openpullrequests: 'open-pull-requests',
  pullrequestsopen: 'open-pull-requests',
  pullrequests: 'open-pull-requests',
  possiblehardcodedsecret: 'hardcoded-secret',
  hardcodedsecret: 'hardcoded-secret',
  hardcodedsecrets: 'hardcoded-secret',
  noobvioushardcodedsecretpatternsdetected: 'hardcoded-secret',
  environmentfilecommitted: 'committed-env-file',
  committedenvfile: 'committed-env-file',
  noobvioussecretfilesdetected: 'committed-env-file',
  committedenvfiles: 'committed-env-file',
  sqlquerybuiltwithstringconcatenation: 'sql-string-concatenation',
  sqlstringconcatenation: 'sql-string-concatenation',
  noobvioussqlstringconcatenationdetected: 'sql-string-concatenation',
  sqlstringconcatenationpatterns: 'sql-string-concatenation',
  noevalusagedetected: 'eval-usage',
  evalusagedetected: 'eval-usage',
  noobviousevalusagedetected: 'eval-usage',
  evalusageinjsts: 'eval-usage',
  permissivecorsconfiguration: 'permissive-cors',
  corsconfigurationmayneedreview: 'permissive-cors',
  jwttokenmaybemissingexpiration: 'jwt-without-expiration',
  jwttokenexpirationconfigured: 'jwt-without-expiration',
  secretfiles: 'committed-env-file',
  hardcodedsecretslegacy: 'hardcoded-secret',
  sqlconcatenation: 'sql-string-concatenation',
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

export function isCodeSafetyCheckId(checkId) {
  return CODE_SAFETY_CHECK_IDS.has(String(checkId || '').trim())
}

export function getRepositoryCheckGuideById(checkId) {
  return (
    REPOSITORY_CHECK_GUIDES.find((item) => item.id === checkId) ||
    ADDITIONAL_REPOSITORY_CHECK_GUIDES.find((item) => item.id === checkId) ||
    null
  )
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
