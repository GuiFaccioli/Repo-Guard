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
            codeContext: [
              { lineNumber: 21, content: 'const app = await NestFactory.create(AppModule);' },
              { lineNumber: 22, content: '' },
              {
                lineNumber: 23,
                content: 'app.use(cors({ origin: "*" }));',
                isFlaggedLine: true,
              },
              { lineNumber: 24, content: '' },
              { lineNumber: 25, content: 'await app.listen(port);' },
            ],
            flaggedLineNumber: 23,
            flaggedLinePointer: '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
            flaggedLineExplanation:
              'This CORS configuration may allow broader origin access than intended.',
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
      codeContext: [
        { lineNumber: 21, content: 'const app = await NestFactory.create(AppModule);' },
        { lineNumber: 22, content: '' },
        {
          lineNumber: 23,
          content: 'app.use(cors({ origin: "*" }));',
          isFlaggedLine: true,
        },
        { lineNumber: 24, content: '' },
        { lineNumber: 25, content: 'await app.listen(port);' },
      ],
      flaggedLineNumber: 23,
      flaggedLinePointer: '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
      flaggedLineExplanation:
        'This CORS configuration may allow broader origin access than intended.',
      githubFileUrl:
        'https://github.com/GuiFaccioli/FlowLogin/blob/main/backend/src/main.ts#L23',
      githubFolderUrl:
        'https://github.com/GuiFaccioli/FlowLogin/tree/main/backend/src',
      recommendationKey: 'explicit-cors-origins',
    });
  });

  it('should keep permissive-cors evidence fields while clamping oversized context', () => {
    const overLimitCorsContext = Array.from({ length: 15 }, (_, index) => {
      const lineNumber = 41 + index;
      return {
        lineNumber,
        content:
          lineNumber === 48
            ? 'app.use(cors({ origin: "*" }));'
            : `const ctx${lineNumber} = "${'x'.repeat(160)}";`,
        isFlaggedLine: lineNumber === 48 ? true : undefined,
      };
    });

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
            lineNumber: 48,
            codeExcerpt: 'app.use(cors({ origin: "*" }));',
            codeContext: overLimitCorsContext,
            flaggedLineNumber: 48,
            githubFileUrl:
              'https://github.com/GuiFaccioli/FlowLogin/blob/main/backend/src/main.ts#L48',
          },
        ],
      },
    ];

    const packet = buildSafeEvidencePacket({
      repository: githubRepository,
      defaultBranch: 'main',
      results,
    });

    const permissiveCorsFinding = packet.findings.find(
      (finding) => finding.checkId === 'permissive-cors',
    );

    expect(permissiveCorsFinding).toBeDefined();
    expect(permissiveCorsFinding?.filePath).toBe('backend/src/main.ts');
    expect(permissiveCorsFinding?.githubFileUrl).toBe(
      'https://github.com/GuiFaccioli/FlowLogin/blob/main/backend/src/main.ts#L48',
    );
    expect(permissiveCorsFinding?.codeContext).toBeDefined();
    expect(permissiveCorsFinding?.codeContext?.length).toBeGreaterThan(0);
    expect(permissiveCorsFinding?.codeContext?.length).toBeLessThanOrEqual(12);
    expect(
      permissiveCorsFinding?.codeContext?.find((line) => line.isFlaggedLine),
    ).toEqual(
      expect.objectContaining({
        lineNumber: 48,
        content: 'app.use(cors({ origin: "*" }));',
      }),
    );

    for (const line of permissiveCorsFinding?.codeContext || []) {
      expect(line.lineNumber).toBeGreaterThan(0);
      expect(line.content.length).toBeLessThanOrEqual(120);
    }
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
            codeExcerpt: 'const apiKey = "LOCAL_DEMO_SECRET_VALUE_ABC123456";',
          },
        ],
      },
    ];

    const packet = buildSafeEvidencePacket({
      repository: githubRepository,
      defaultBranch: 'main',
      results,
    });

    expect(packet.findings[0].safeExcerpt).toBe('const apiKey = "LOCA********";');
  });

  it('should mask hardcoded-secret values inside code context lines', () => {
    const rawSecret = 'AlphaBetaGammaDelta1234567890';
    const results: ScanChecklistResult[] = [
      {
        checklist: 'security_basics',
        title: 'Code safety signals',
        items: [
          {
            label: 'Possible hardcoded secret',
            status: 'fail',
            details: 'A secret-like value appears to be written directly in code.',
            filePath: 'backend/src/main.ts',
            lineNumber: 12,
            codeExcerpt: `const apiKey = "${rawSecret}";`,
            codeContext: [
              { lineNumber: 10, content: 'const app = createApp();' },
              {
                lineNumber: 12,
                content: `const apiKey = "${rawSecret}";`,
                isFlaggedLine: true,
              },
            ],
          },
        ],
      },
    ];

    const packet = buildSafeEvidencePacket({
      repository: githubRepository,
      defaultBranch: 'main',
      results,
    });

    expect(packet.findings[0].safeExcerpt).toBe('const apiKey = "Alph********";');
    expect(packet.findings[0].codeContext).toEqual([
      { lineNumber: 10, content: 'const app = createApp();' },
      {
        lineNumber: 12,
        content: 'const apiKey = "Alph********";',
        isFlaggedLine: true,
      },
    ]);
    expect(JSON.stringify(packet)).not.toContain(rawSecret);
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
            codeContext: [
              { lineNumber: 1, content: 'API_KEY=real-secret-value', isFlaggedLine: true },
            ],
            flaggedLineNumber: 1,
            flaggedLinePointer: '^^^^^^^^^^^^^^^^^^^^^^^^^',
            flaggedLineExplanation: 'This line may contain a private value.',
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
    expect(packet.findings[0].codeContext).toBeUndefined();
    expect(packet.findings[0].flaggedLineNumber).toBeUndefined();
    expect(packet.findings[0].flaggedLinePointer).toBeUndefined();
    expect(packet.findings[0].flaggedLineExplanation).toBeUndefined();
  });

  it('should enforce safe bounds for reviewed code context lines', () => {
    const overLimitContext = Array.from({ length: 16 }, (_, index) => ({
      lineNumber: index + 1,
      content: `const veryLongLine${index} = "${'x'.repeat(200)}";`,
      isFlaggedLine: index === 7 ? true : undefined,
    }));
    const results: ScanChecklistResult[] = [
      {
        checklist: 'security_basics',
        title: 'Code safety signals',
        items: [
          {
            label: 'SQL query built with string concatenation',
            status: 'fail',
            details: 'SQL query appears to be built with dynamic string content.',
            filePath: 'backend/src/db.ts',
            lineNumber: 8,
            codeExcerpt: "const query = 'SELECT * FROM users WHERE id = ' + userId;",
            codeContext: overLimitContext,
            flaggedLineNumber: 8,
          },
        ],
      },
    ];

    const packet = buildSafeEvidencePacket({
      repository: githubRepository,
      defaultBranch: 'main',
      results,
    });

    expect(packet.findings[0].codeContext).toBeDefined();
    expect(packet.findings[0].codeContext?.length).toBeLessThanOrEqual(12);
    for (const line of packet.findings[0].codeContext || []) {
      expect(line.content.length).toBeLessThanOrEqual(120);
    }
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
