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
  codeContext?: SafeEvidenceCodeContextLine[];
  flaggedLineNumber?: number;
  flaggedLinePointer?: string;
  flaggedLineExplanation?: string;
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
  codeContext?: SafeEvidenceCodeContextLine[];
  flaggedLineNumber?: number;
  flaggedLinePointer?: string;
  flaggedLineExplanation?: string;
  githubFileUrl?: string;
  githubFolderUrl?: string;
  recommendationKey?: string;
}

export interface SafeEvidenceCodeContextLine {
  lineNumber: number;
  content: string;
  isFlaggedLine?: boolean;
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

export type DidacticStatus = 'green' | 'yellow' | 'red';
export type DidacticConfidence = 'high' | 'medium' | 'low';
export type RepositoryContextKind =
  | 'fullstack-app'
  | 'library-sdk'
  | 'scientific'
  | 'automation'
  | 'unknown';

export interface SourceReference {
  title: string;
  url: string;
  sourceType: 'official' | 'community' | 'specification';
}

export interface DidacticCheckResult {
  checkId: string;
  label: string;
  status: DidacticStatus;
  confidence: DidacticConfidence;
  whatChecked: string;
  whyItMatters: string;
  whatFound: string;
  suggestedAction: string;
  sources: SourceReference[];
  uncertaintyNote?: string;
}

export interface RepositoryContextProfile {
  primary: RepositoryContextKind;
  secondary: RepositoryContextKind[];
  confidence: DidacticConfidence;
  signals: string[];
}

export interface ScanRepositoryResponse {
  repository: ParsedRepositoryTarget;
  scanType: 'general';
  selectedChecklists: ScanChecklistId[];
  summary: {
    green: number;
    yellow: number;
    red: number;
  };
  context: RepositoryContextProfile;
  didacticChecks: DidacticCheckResult[];
  results: ScanChecklistResult[];
  evidencePacket?: SafeEvidencePacket;
  aiReview?: AiReviewReport;
}
