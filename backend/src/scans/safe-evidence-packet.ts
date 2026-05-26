import {
  ParsedRepositoryTarget,
  SafeEvidenceCategory,
  SafeEvidenceFinding,
  SafeEvidencePacket,
  SafeEvidenceScanType,
  ScanChecklistResult,
  ScanItemStatus,
} from './scans.types';

interface BuildSafeEvidencePacketInput {
  repository: ParsedRepositoryTarget;
  defaultBranch: string;
  scanType?: SafeEvidenceScanType;
  createdAt?: string;
  results: ScanChecklistResult[];
}

const MAX_SAFE_EXCERPT_LENGTH = 200;

const CHECK_ID_BY_LABEL_TOKEN: Record<string, string> = {
  readmeexists: 'readme',
  gitignoreexists: 'gitignore',
  packagemetadataispresent: 'package-json',
  dependencyautomationisconfigured: 'dependabot',
  ciautomationisconfigured: 'github-actions',
  licensefileexists: 'license',
  recentactivity: 'recent-activity',
  openissues: 'open-issues',
  openpullrequests: 'open-pull-requests',
  possiblehardcodedsecret: 'hardcoded-secret',
  environmentfilecommitted: 'committed-env-file',
  sqlquerybuiltwithstringconcatenation: 'sql-string-concatenation',
  noevalusagedetected: 'eval-usage',
  permissivecorsconfiguration: 'permissive-cors',
};

const RECOMMENDATION_KEY_BY_CHECK_ID: Record<string, string> = {
  readme: 'add-readme',
  gitignore: 'add-gitignore',
  'package-json': 'add-package-json',
  dependabot: 'add-dependabot',
  'github-actions': 'add-github-actions',
  license: 'add-license',
  'hardcoded-secret': 'move-secret-to-env',
  'committed-env-file': 'remove-committed-env',
  'sql-string-concatenation': 'use-parameterized-query',
  'eval-usage': 'avoid-dynamic-code-execution',
  'permissive-cors': 'explicit-cors-origins',
};

const SECRET_LITERAL_PATTERN =
  /((?:api[_-]?key|token|secret|password|jwt[_-]?secret|client[_-]?secret)[\w$ \t]{0,32}[:=]\s*['"`])([^'"`\n]{6,})(['"`])/gi;
const HIGH_ENTROPY_TOKEN_PATTERN =
  /\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk_(?:live|test)_[A-Za-z0-9]{12,}|AKIA[0-9A-Z]{8,}|AIza[0-9A-Za-z_-]{12,})\b/g;

export function buildSafeEvidencePacket(
  input: BuildSafeEvidencePacketInput,
): SafeEvidencePacket {
  const scanType: SafeEvidenceScanType = input.scanType || 'green';
  const createdAt = normalizeIsoDate(input.createdAt) || new Date().toISOString();
  const repository = buildRepositoryMetadata(input.repository, input.defaultBranch);
  const findings = buildFindings(input.repository, input.results);

  return {
    repository,
    scan: {
      scanType,
      createdAt,
    },
    findings,
    safety: {
      secretsMasked: true,
      fullFilesIncluded: false,
      rawEnvIncluded: false,
      tokensIncluded: false,
    },
  };
}

function buildRepositoryMetadata(
  repository: ParsedRepositoryTarget,
  defaultBranchInput: string,
) {
  return {
    owner: repository.owner,
    name: repository.name,
    fullName: `${repository.owner}/${repository.name}`,
    defaultBranch: sanitizeBranch(defaultBranchInput) || 'main',
    htmlUrl: sanitizeRepositoryUrl(repository.url),
  };
}

function buildFindings(
  repository: ParsedRepositoryTarget,
  results: ScanChecklistResult[],
): SafeEvidenceFinding[] {
  const findings: SafeEvidenceFinding[] = [];

  for (const result of results) {
    const category: SafeEvidenceCategory =
      result.checklist === 'security_basics' ? 'code-safety' : 'repository-health';

    for (const item of result.items || []) {
      const checkId = resolveCheckId(item.label);
      const recommendationKey = checkId
        ? RECOMMENDATION_KEY_BY_CHECK_ID[checkId] || undefined
        : undefined;
      const filePath = sanitizeFilePath(item.filePath);
      const lineNumber = sanitizeLineNumber(item.lineNumber);
      const safeExcerpt = buildSafeExcerpt(
        checkId,
        item.status,
        item.codeExcerpt,
      );
      const githubFileUrl = sanitizeGithubNavigationUrl(
        repository.provider,
        item.githubFileUrl,
      );
      const githubFolderUrl = sanitizeGithubNavigationUrl(
        repository.provider,
        item.githubFolderUrl,
      );

      findings.push({
        checkId: checkId || 'unknown-check',
        category,
        status: sanitizeStatus(item.status),
        title: sanitizeTitle(item.label),
        summary: sanitizeSummary(item.details),
        filePath: filePath || undefined,
        lineNumber: lineNumber || undefined,
        safeExcerpt: safeExcerpt || undefined,
        githubFileUrl: githubFileUrl || undefined,
        githubFolderUrl: githubFolderUrl || undefined,
        recommendationKey,
      });
    }
  }

  return findings;
}

function resolveCheckId(label: string): string | null {
  const normalized = normalizeLabelToken(label);
  if (!normalized) {
    return null;
  }

  return CHECK_ID_BY_LABEL_TOKEN[normalized] || null;
}

function buildSafeExcerpt(
  checkId: string | null,
  status: ScanItemStatus,
  excerptInput?: string,
): string | null {
  if (checkId === 'committed-env-file' && status === 'fail') {
    return '.env file detected. Content intentionally hidden.';
  }

  if (typeof excerptInput !== 'string' || !excerptInput.trim()) {
    return null;
  }

  const compactExcerpt = excerptInput.replace(/\s+/g, ' ').trim();
  if (!compactExcerpt) {
    return null;
  }

  const maskedExcerpt = maskSensitiveLiterals(compactExcerpt);
  if (!maskedExcerpt) {
    return null;
  }

  return clampText(maskedExcerpt, MAX_SAFE_EXCERPT_LENGTH);
}

function maskSensitiveLiterals(value: string): string {
  const withMaskedAssignments = value.replace(
    SECRET_LITERAL_PATTERN,
    (_, prefix: string, secretValue: string, suffix: string) =>
      `${prefix}${maskToken(secretValue)}${suffix}`,
  );

  return withMaskedAssignments.replace(
    HIGH_ENTROPY_TOKEN_PATTERN,
    (token) => maskToken(token),
  );
}

function maskToken(value: string): string {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) {
    return '********';
  }

  const stripePrefix = normalizedValue.match(/^sk_(?:live|test)_/i)?.[0];
  if (stripePrefix) {
    return `${stripePrefix}********`;
  }

  const githubPrefix = normalizedValue.match(/^(?:ghp_|github_pat_)/i)?.[0];
  if (githubPrefix) {
    return `${githubPrefix}********`;
  }

  const awsPrefix = normalizedValue.match(/^AKIA/i)?.[0];
  if (awsPrefix) {
    return `${awsPrefix}********`;
  }

  const visiblePrefix = normalizedValue.slice(0, Math.min(4, normalizedValue.length));
  return `${visiblePrefix}********`;
}

function sanitizeFilePath(filePathInput?: string): string | null {
  if (typeof filePathInput !== 'string') {
    return null;
  }

  const normalizedPath = filePathInput
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/')
    .trim();

  if (!normalizedPath || normalizedPath.length > 300) {
    return null;
  }

  const pathSegments = normalizedPath.split('/');
  for (const segment of pathSegments) {
    if (
      !segment ||
      segment === '.' ||
      segment === '..' ||
      /[\u0000-\u001f\u007f]/.test(segment)
    ) {
      return null;
    }
  }

  return normalizedPath;
}

function sanitizeLineNumber(lineNumberInput?: number): number | null {
  if (!Number.isFinite(lineNumberInput) || Number(lineNumberInput) <= 0) {
    return null;
  }

  return Math.floor(Number(lineNumberInput));
}

function sanitizeGithubNavigationUrl(
  provider: ParsedRepositoryTarget['provider'],
  urlInput?: string,
): string | null {
  if (provider !== 'github') {
    return null;
  }

  if (typeof urlInput !== 'string' || !urlInput.trim()) {
    return null;
  }

  const url = urlInput.trim();
  if (!/^https:\/\/github\.com\/[^\s?#]+(?:#L\d+)?$/i.test(url)) {
    return null;
  }

  return url.slice(0, 2048);
}

function sanitizeRepositoryUrl(urlInput: string): string {
  if (typeof urlInput !== 'string') {
    return '';
  }

  const trimmedUrl = urlInput.trim();
  if (!/^https?:\/\/[^?#\s]+$/i.test(trimmedUrl)) {
    return '';
  }

  return trimmedUrl.slice(0, 2048);
}

function sanitizeBranch(branchInput: string): string {
  if (typeof branchInput !== 'string') {
    return '';
  }

  const branch = branchInput.trim();
  if (!branch || branch.length > 120) {
    return '';
  }

  if (/[\u0000-\u001f\u007f\s]/.test(branch)) {
    return '';
  }

  return branch;
}

function normalizeIsoDate(value?: string): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

function normalizeLabelToken(labelInput: string): string {
  if (typeof labelInput !== 'string') {
    return '';
  }

  return labelInput.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function sanitizeTitle(labelInput: string): string {
  if (typeof labelInput !== 'string') {
    return 'Unknown check';
  }

  const title = labelInput.trim();
  if (!title) {
    return 'Unknown check';
  }

  return clampText(title, 120);
}

function sanitizeSummary(summaryInput: string): string {
  if (typeof summaryInput !== 'string') {
    return 'No summary available.';
  }

  const summary = summaryInput.replace(/\s+/g, ' ').trim();
  if (!summary) {
    return 'No summary available.';
  }

  return clampText(summary, 220);
}

function sanitizeStatus(statusInput: ScanItemStatus): ScanItemStatus {
  return statusInput === 'pass' ? 'pass' : 'fail';
}

function clampText(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, Math.max(0, limit - 3))}...`;
}
