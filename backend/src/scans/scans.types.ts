export type ScanProvider = 'github' | 'gitlab' | 'bitbucket';

export type ScanChecklistId = 'good_practices' | 'security_basics';
export type ScanItemStatus = 'pass' | 'fail';

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
}

export interface ScanChecklistResult {
  checklist: ScanChecklistId;
  title: string;
  items: ScanChecklistItem[];
}

export interface ScanRepositoryResponse {
  repository: ParsedRepositoryTarget;
  selectedChecklists: ScanChecklistId[];
  results: ScanChecklistResult[];
}
