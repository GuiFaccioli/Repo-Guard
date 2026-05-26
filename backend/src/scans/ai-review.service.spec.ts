import { AiReviewService } from './ai-review.service';
import { SafeEvidencePacket } from './scans.types';

describe('AiReviewService', () => {
  const service = new AiReviewService();

  const basePacket: SafeEvidencePacket = {
    repository: {
      owner: 'GuiFaccioli',
      name: 'FlowLogin',
      fullName: 'GuiFaccioli/FlowLogin',
      defaultBranch: 'main',
      htmlUrl: 'https://github.com/GuiFaccioli/FlowLogin',
    },
    scan: {
      scanType: 'green',
      createdAt: '2026-05-26T00:00:00.000Z',
    },
    findings: [],
    safety: {
      secretsMasked: true,
      fullFilesIncluded: false,
      rawEnvIncluded: false,
      tokensIncluded: false,
    },
  };

  it('groups failed findings into deterministic review topics', () => {
    const report = service.generateFromEvidencePacket({
      ...basePacket,
      findings: [
        {
          checkId: 'permissive-cors',
          category: 'code-safety',
          status: 'fail',
          title: 'Permissive CORS configuration',
          summary: 'CORS may be too permissive.',
        },
        {
          checkId: 'permissive-cors',
          category: 'code-safety',
          status: 'fail',
          title: 'Permissive CORS configuration',
          summary: 'CORS appears broad in another file.',
        },
        {
          checkId: 'sql-string-concatenation',
          category: 'code-safety',
          status: 'fail',
          title: 'SQL query built with string concatenation',
          summary: 'A SQL query appears to concatenate dynamic data.',
        },
        {
          checkId: 'dependabot',
          category: 'repository-health',
          status: 'pass',
          title: 'Dependency automation is configured',
          summary: 'Dependabot configuration was found.',
        },
      ],
    });

    expect(report.summary).toBe(
      'RepoGuard found 3 code safety signals that should be reviewed.',
    );
    expect(report.topics).toEqual([
      expect.objectContaining({
        id: 'review-cors-configuration',
        priority: 'review before production',
        evidenceCheckIds: ['permissive-cors'],
      }),
      expect.objectContaining({
        id: 'review-sql-query-construction',
        priority: 'review before production',
        evidenceCheckIds: ['sql-string-concatenation'],
      }),
    ]);
  });

  it('does not create topics when findings do not fail', () => {
    const report = service.generateFromEvidencePacket({
      ...basePacket,
      findings: [
        {
          checkId: 'github-actions',
          category: 'repository-health',
          status: 'pass',
          title: 'CI automation is configured',
          summary: 'At least one automation file was found.',
        },
      ],
    });

    expect(report.summary).toBe(
      'RepoGuard did not find failed safety signals in this evidence packet.',
    );
    expect(report.topics).toEqual([]);
  });

  it('uses calm priority language', () => {
    const report = service.generateFromEvidencePacket({
      ...basePacket,
      findings: [
        {
          checkId: 'github-actions',
          category: 'repository-health',
          status: 'fail',
          title: 'CI automation is configured',
          summary: 'No automation file was found.',
        },
      ],
    });

    const allowedPriorities = new Set([
      'review before production',
      'recommended improvement',
      'maintenance signal',
      'informational',
    ]);

    report.topics.forEach((topic) => {
      expect(allowedPriorities.has(topic.priority)).toBe(true);
      expect(topic.priority).not.toContain('critical');
      expect(topic.priority).not.toContain('severe');
      expect(topic.priority).not.toContain('danger');
    });
  });

  it('marks provider metadata as deterministic and provider-free', () => {
    const report = service.generateFromEvidencePacket(basePacket);

    expect(report.safety).toEqual({
      generatedFromEvidenceOnly: true,
      providerUsed: false,
      model: null,
    });
  });

  it('does not include raw secret strings in the review report', () => {
    const rawSecret = 'sk_live_1234567890abcdef';
    const report = service.generateFromEvidencePacket({
      ...basePacket,
      findings: [
        {
          checkId: 'hardcoded-secret',
          category: 'code-safety',
          status: 'fail',
          title: 'Possible hardcoded secret',
          summary: 'A secret-like value appears to be written directly in code.',
          safeExcerpt: `const apiKey = "${rawSecret}";`,
        },
      ],
    });

    const reportText = JSON.stringify(report);
    expect(reportText).not.toContain(rawSecret);
    expect(reportText).not.toContain('safeExcerpt');
    expect(report.topics[0]).toMatchObject({
      id: 'move-secrets-out-of-source',
      evidenceCheckIds: ['hardcoded-secret'],
    });
  });
});
