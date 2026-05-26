import { Injectable } from '@nestjs/common';
import {
  AiReviewPriority,
  AiReviewReport,
  AiReviewTopic,
  SafeEvidenceFinding,
  SafeEvidencePacket,
} from './scans.types';

interface AiReviewTopicTemplate {
  id: string;
  title: string;
  priority: AiReviewPriority;
  explanation: string;
  recommendedDirection: string;
  nextSteps: string[];
}

const SAFETY_METADATA = {
  generatedFromEvidenceOnly: true,
  providerUsed: false,
  model: null,
} as const;

const CHECK_TOPIC_TEMPLATES: Record<string, AiReviewTopicTemplate> = {
  'permissive-cors': {
    id: 'review-cors-configuration',
    title: 'Review CORS configuration',
    priority: 'review before production',
    explanation:
      'RepoGuard found a CORS configuration that may allow broad access.',
    recommendedDirection:
      'Prefer explicit allowed origins for each environment.',
    nextSteps: [
      'Review the allowed origins for production.',
      'Replace wildcard origin with explicit frontend URLs.',
      'Confirm credentials/cookies are only enabled when needed.',
    ],
  },
  'sql-string-concatenation': {
    id: 'review-sql-query-construction',
    title: 'Review SQL query construction',
    priority: 'review before production',
    explanation:
      'RepoGuard found SQL query construction that appears to rely on string concatenation.',
    recommendedDirection:
      'Use parameterized queries consistently for dynamic values.',
    nextSteps: [
      'Find query segments that concatenate runtime values.',
      'Replace string concatenation with parameterized query APIs.',
      'Add a regression test that verifies safe query handling.',
    ],
  },
  'hardcoded-secret': {
    id: 'move-secrets-out-of-source',
    title: 'Move secrets out of source code',
    priority: 'review before production',
    explanation:
      'RepoGuard found a secret-like assignment directly in source code.',
    recommendedDirection:
      'Store secrets in environment configuration and load them at runtime.',
    nextSteps: [
      'Replace hardcoded secret values with environment variables.',
      'Rotate any exposed secret values.',
      'Confirm secret scanning is enabled for future commits.',
    ],
  },
  'committed-env-file': {
    id: 'remove-environment-files-from-version-control',
    title: 'Remove environment files from version control',
    priority: 'review before production',
    explanation:
      'RepoGuard detected an environment file committed to the repository tree.',
    recommendedDirection:
      'Keep runtime environment files local and outside version control.',
    nextSteps: [
      'Remove committed environment files from the repository.',
      'Add environment file patterns to .gitignore.',
      'Regenerate and rotate any values that may have been exposed.',
    ],
  },
  'eval-usage': {
    id: 'avoid-dynamic-code-execution',
    title: 'Avoid dynamic code execution',
    priority: 'review before production',
    explanation:
      'RepoGuard detected dynamic code execution usage that should be reviewed.',
    recommendedDirection:
      'Prefer explicit control flow and safe parsing over runtime code execution.',
    nextSteps: [
      'Review places that use eval or Function constructors.',
      'Replace dynamic execution with explicit logic where possible.',
      'Add tests for expected behavior after the refactor.',
    ],
  },
  dependabot: {
    id: 'add-dependabot',
    title: 'Add dependency update automation',
    priority: 'recommended improvement',
    explanation:
      'RepoGuard did not find dependency update automation for this repository.',
    recommendedDirection:
      'Enable automated dependency update checks to keep dependencies current.',
    nextSteps: [
      'Add a Dependabot configuration under .github.',
      'Define update frequency aligned with your release cadence.',
      'Review and merge update pull requests regularly.',
    ],
  },
  'github-actions': {
    id: 'add-github-actions',
    title: 'Add CI automation',
    priority: 'maintenance signal',
    explanation:
      'RepoGuard did not find a CI workflow configuration in the repository.',
    recommendedDirection:
      'Use a lightweight CI workflow to validate quality on each change.',
    nextSteps: [
      'Add a workflow file under .github/workflows.',
      'Run build and test checks on pull requests.',
      'Require successful workflow checks before merge.',
    ],
  },
};

const PRIORITY_WEIGHT: Record<AiReviewPriority, number> = {
  'review before production': 1,
  'recommended improvement': 2,
  'maintenance signal': 3,
  informational: 4,
};

@Injectable()
export class AiReviewService {
  generateFromEvidencePacket(evidencePacket: SafeEvidencePacket): AiReviewReport {
    const failedFindings = evidencePacket.findings.filter(
      (finding) => finding.status === 'fail',
    );
    const groupedFindings = this.groupByCheckId(failedFindings);
    const topics = this.buildTopics(groupedFindings);

    return {
      summary: this.buildSummary(failedFindings.length),
      topics,
      safety: SAFETY_METADATA,
    };
  }

  private groupByCheckId(
    failedFindings: SafeEvidenceFinding[],
  ): Map<string, SafeEvidenceFinding[]> {
    const grouped = new Map<string, SafeEvidenceFinding[]>();

    for (const finding of failedFindings) {
      const checkId = this.normalizeCheckId(finding.checkId);
      const list = grouped.get(checkId) || [];
      list.push(finding);
      grouped.set(checkId, list);
    }

    return grouped;
  }

  private buildTopics(
    groupedFindings: Map<string, SafeEvidenceFinding[]>,
  ): AiReviewTopic[] {
    const sortedCheckIds = Array.from(groupedFindings.keys()).sort((a, b) =>
      a.localeCompare(b),
    );

    const topics = sortedCheckIds.map((checkId) => {
      const template = CHECK_TOPIC_TEMPLATES[checkId];
      if (template) {
        return {
          id: template.id,
          title: template.title,
          priority: template.priority,
          evidenceCheckIds: [checkId],
          explanation: template.explanation,
          recommendedDirection: template.recommendedDirection,
          nextSteps: [...template.nextSteps],
        };
      }

      return this.buildFallbackTopic(checkId);
    });

    return topics.sort((a, b) => {
      const byPriority =
        PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (byPriority !== 0) {
        return byPriority;
      }

      return a.id.localeCompare(b.id);
    });
  }

  private buildFallbackTopic(checkId: string): AiReviewTopic {
    const normalizedCheckId = this.normalizeCheckId(checkId);
    const humanCheckId = normalizedCheckId.replace(/-/g, ' ');

    return {
      id: `review-${normalizedCheckId}`,
      title: `Review ${humanCheckId}`,
      priority: 'informational',
      evidenceCheckIds: [normalizedCheckId],
      explanation:
        'RepoGuard found a failed check that should be reviewed in context.',
      recommendedDirection:
        'Review the evidence for this check and decide the next corrective step.',
      nextSteps: [
        'Open the related check evidence and confirm the finding context.',
        'Decide whether a code or configuration update is required.',
        'Track follow-up work in your normal development workflow.',
      ],
    };
  }

  private buildSummary(failedFindingCount: number): string {
    if (failedFindingCount <= 0) {
      return 'RepoGuard did not find failed safety signals in this evidence packet.';
    }

    const noun = failedFindingCount === 1 ? 'signal' : 'signals';
    return `RepoGuard found ${failedFindingCount} code safety ${noun} that should be reviewed.`;
  }

  private normalizeCheckId(checkIdInput: string): string {
    if (typeof checkIdInput !== 'string') {
      return 'unknown-check';
    }

    const normalized = checkIdInput.trim().toLowerCase();
    if (!normalized) {
      return 'unknown-check';
    }

    return normalized;
  }
}
