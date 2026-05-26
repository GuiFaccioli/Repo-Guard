export type ScanProvider = 'github' | 'gitlab' | 'bitbucket';

export type ScanChecklistId = 'good_practices' | 'security_basics';
export type ScanItemStatus = 'pass' | 'fail';
export type SafeEvidenceScanType = 'green';
export type SafeEvidenceCategory = 'repository-health' | 'code-safety';
export type AiReviewPriority =
  | 'review before production'
  | 'recommended improvement'
  | 'maintenance signal'
  | 'informational';

export interface ParsedRepositoryTarget {
  provider: ScanProvider;
  owner: string;
  name: string;
  url: string;
}

export interface ScanChecklistItem {
  label: string;
  status: ScanItemStatus;
  details: string;
  filePath?: string;
  lineNumber?: number;
  codeExcerpt?: string;
  githubFileUrl?: string;
  githubFolderUrl?: string;
}

export interface ScanChecklistResult {
  checklist: ScanChecklistId;
  title: string;
  items: ScanChecklistItem[];
}

export interface SafeEvidenceRepository {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  htmlUrl: string;
}

export interface SafeEvidenceScanMetadata {
  scanType: SafeEvidenceScanType;
  createdAt: string;
}

export interface SafeEvidenceFinding {
  checkId: string;
  category: SafeEvidenceCategory;
  status: ScanItemStatus;
  title: string;
  summary: string;
  filePath?: string;
  lineNumber?: number;
  safeExcerpt?: string;
  githubFileUrl?: string;
  githubFolderUrl?: string;
  recommendationKey?: string;
}

export interface SafeEvidenceSafetyMetadata {
  secretsMasked: true;
  fullFilesIncluded: false;
  rawEnvIncluded: false;
  tokensIncluded: false;
}

export interface SafeEvidencePacket {
  repository: SafeEvidenceRepository;
  scan: SafeEvidenceScanMetadata;
  findings: SafeEvidenceFinding[];
  safety: SafeEvidenceSafetyMetadata;
}

export interface AiReviewTopic {
  id: string;
  title: string;
  priority: AiReviewPriority;
  evidenceCheckIds: string[];
  explanation: string;
  recommendedDirection: string;
  nextSteps: string[];
}

export interface AiReviewSafetyMetadata {
  generatedFromEvidenceOnly: true;
  providerUsed: false;
  model: null;
}

export interface AiReviewReport {
  summary: string;
  topics: AiReviewTopic[];
  safety: AiReviewSafetyMetadata;
}

export interface ScanRepositoryResponse {
  repository: ParsedRepositoryTarget;
  selectedChecklists: ScanChecklistId[];
  results: ScanChecklistResult[];
  evidencePacket?: SafeEvidencePacket;
  aiReview?: AiReviewReport;
}
