import { buildSafeEvidencePacket } from './safe-evidence-packet';
import { ScanChecklistResult } from './scans.types';

describe('buildSafeEvidencePacket', () => {
  const githubRepository = {
    provider: 'github' as const,
    owner: 'GuiFaccioli',
    name: 'FlowLogin',
    url: 'https://github.com/GuiFaccioli/FlowLogin',
  };

  it('should map deterministic findings with safe metadata', () => {
    const results: ScanChecklistResult[] = [
      {
        checklist: 'security_basics',
        title: 'Code safety signals',
        items: [
          {
            label: 'Permissive CORS configuration',
            status: 'fail',
            details: 'CORS configuration may need review.',
            filePath: 'backend/src/main.ts',
            lineNumber: 23,
            codeExcerpt: 'app.use(cors({ origin: "*" }));',
            githubFileUrl:
              'https://github.com/GuiFaccioli/FlowLogin/blob/main/backend/src/main.ts#L23',
            githubFolderUrl:
              'https://github.com/GuiFaccioli/FlowLogin/tree/main/backend/src',
          },
        ],
      },
    ];

    const packet = buildSafeEvidencePacket({
      repository: githubRepository,
      defaultBranch: 'main',
      scanType: 'green',
      createdAt: '2026-05-26T00:00:00.000Z',
      results,
    });

    expect(packet.repository).toEqual({
      owner: 'GuiFaccioli',
      name: 'FlowLogin',
      fullName: 'GuiFaccioli/FlowLogin',
      defaultBranch: 'main',
      htmlUrl: 'https://github.com/GuiFaccioli/FlowLogin',
    });

    expect(packet.findings[0]).toMatchObject({
      checkId: 'permissive-cors',
      category: 'code-safety',
      status: 'fail',
      title: 'Permissive CORS configuration',
      summary: 'CORS configuration may need review.',
      filePath: 'backend/src/main.ts',
      lineNumber: 23,
      safeExcerpt: 'app.use(cors({ origin: "*" }));',
      githubFileUrl:
        'https://github.com/GuiFaccioli/FlowLogin/blob/main/backend/src/main.ts#L23',
      githubFolderUrl:
        'https://github.com/GuiFaccioli/FlowLogin/tree/main/backend/src',
      recommendationKey: 'explicit-cors-origins',
    });
  });

  it('should mask secret-like values in excerpts', () => {
    const results: ScanChecklistResult[] = [
      {
        checklist: 'security_basics',
        title: 'Code safety signals',
        items: [
          {
            label: 'Possible hardcoded secret',
            status: 'fail',
            details: 'A secret-like value appears to be written directly in code.',
            codeExcerpt: 'const apiKey = "sk_live_abcdef1234567890";',
          },
        ],
      },
    ];

    const packet = buildSafeEvidencePacket({
      repository: githubRepository,
      defaultBranch: 'main',
      results,
    });

    expect(packet.findings[0].safeExcerpt).toBe(
      'const apiKey = "sk_live_********";',
    );
  });

  it('should never expose raw .env content in safe excerpts', () => {
    const results: ScanChecklistResult[] = [
      {
        checklist: 'security_basics',
        title: 'Code safety signals',
        items: [
          {
            label: 'Environment file committed',
            status: 'fail',
            details: 'Environment files can expose private configuration.',
            codeExcerpt: 'API_KEY=real-secret-value',
            filePath: '.env',
          },
        ],
      },
    ];

    const packet = buildSafeEvidencePacket({
      repository: githubRepository,
      defaultBranch: 'main',
      results,
    });

    expect(packet.findings[0].safeExcerpt).toBe(
      '.env file detected. Content intentionally hidden.',
    );
  });

  it('should omit github navigation URLs for non-github repositories', () => {
    const results: ScanChecklistResult[] = [
      {
        checklist: 'good_practices',
        title: 'Repository health',
        items: [
          {
            label: 'README exists',
            status: 'pass',
            details: 'README file found in the repository tree.',
            githubFileUrl:
              'https://github.com/GuiFaccioli/FlowLogin/blob/main/README.md',
          },
        ],
      },
    ];

    const packet = buildSafeEvidencePacket({
      repository: {
        provider: 'gitlab',
        owner: 'group',
        name: 'project',
        url: 'https://gitlab.com/group/project',
      },
      defaultBranch: 'main',
      results,
    });

    expect(packet.findings[0].githubFileUrl).toBeUndefined();
    expect(packet.findings[0].githubFolderUrl).toBeUndefined();
  });
});
