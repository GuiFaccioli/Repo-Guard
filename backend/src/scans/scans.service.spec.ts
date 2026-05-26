import { ScansService } from './scans.service';
import { AiReviewService } from './ai-review.service';

describe('ScansService', () => {
  const aiReviewService = new AiReviewService();
  const scansService = new ScansService(aiReviewService);
  const service = scansService as unknown as {
    parseRepositoryUrl: (repositoryUrl: string) => {
      provider: string;
      owner: string;
      name: string;
      url: string;
    };
    normalizeRequest: (
      repositoryUrlInput: unknown,
      checklistsInput: unknown,
    ) => {
      repositoryUrl: string;
      checklists: string[];
    };
  };
  const originalFetch = global.fetch;

  const toJsonResponse = (payload: unknown, status = 200): Response =>
    ({
      status,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
      headers: {
        get: () => null,
      },
    }) as unknown as Response;

  const toTextResponse = (payload: string, status = 200): Response =>
    ({
      status,
      json: async () => JSON.parse(payload),
      text: async () => payload,
      headers: {
        get: () => null,
      },
    }) as unknown as Response;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('should normalize GitHub repository URLs', () => {
    expect(
      service.parseRepositoryUrl('https://github.com/User/Repo/tree/main'),
    ).toEqual({
      provider: 'github',
      owner: 'User',
      name: 'Repo',
      url: 'https://github.com/User/Repo',
    });
  });

  it('should normalize nested GitLab repository URLs', () => {
    expect(
      service.parseRepositoryUrl(
        'https://gitlab.com/group/subgroup/project/-/tree/main',
      ),
    ).toEqual({
      provider: 'gitlab',
      owner: 'group/subgroup',
      name: 'project',
      url: 'https://gitlab.com/group/subgroup/project',
    });
  });

  it('should reject unsupported repository URLs', () => {
    expect(() =>
      service.parseRepositoryUrl('https://example.com/user/repo'),
    ).toThrow();
  });

  it('should require at least one checklist', () => {
    expect(() =>
      service.normalizeRequest(
        'https://github.com/user/repo',
        [],
      ),
    ).toThrow('At least one checklist is required.');
  });

  it('should reject unknown checklist values', () => {
    expect(() =>
      service.normalizeRequest('https://github.com/user/repo', [
        'good_practices',
        'yellow_scan',
      ]),
    ).toThrow('Unsupported checklist: yellow_scan');
  });

  it('should return results, evidence packet, and ai review from the full scan flow', async () => {
    const rawSecret = 'AlphaBetaGammaDelta1234567890';
    const mockFileContent = [
      'import cors from "cors";',
      `const apiKey = "${rawSecret}";`,
      'app.use(cors({ origin: "*" }));',
      'await app.listen(port);',
    ].join('\n');

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (
        url.includes('https://api.github.com/repos/RepoOwner/RepoName') &&
        !url.includes('/git/trees/')
      ) {
        return toJsonResponse({
          default_branch: 'main',
          pushed_at: '2026-05-26T00:00:00.000Z',
        });
      }

      if (
        url.includes(
          'https://api.github.com/repos/RepoOwner/RepoName/git/trees/main?recursive=1',
        )
      ) {
        return toJsonResponse({
          tree: [
            { path: 'backend/src/main.ts' },
            { path: '.env' },
            { path: 'README.md' },
          ],
        });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:issue')
      ) {
        return toJsonResponse({ total_count: 1 });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:pr')
      ) {
        return toJsonResponse({ total_count: 1 });
      }

      if (url.includes('https://raw.githubusercontent.com/')) {
        return toTextResponse(mockFileContent);
      }

      throw new Error(`Unexpected fetch URL in test: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await scansService.runScan(
      'https://github.com/RepoOwner/RepoName',
      ['good_practices', 'security_basics'],
    );

    expect(response.repository).toMatchObject({
      provider: 'github',
      owner: 'RepoOwner',
      name: 'RepoName',
      url: 'https://github.com/RepoOwner/RepoName',
    });
    expect(response.selectedChecklists).toEqual([
      'good_practices',
      'security_basics',
    ]);
    expect(Array.isArray(response.results)).toBe(true);
    expect(response.results.length).toBe(2);

    expect(response.evidencePacket).toBeDefined();
    expect(response.aiReview).toBeDefined();

    const evidencePacket = response.evidencePacket!;
    const aiReview = response.aiReview!;

    expect(aiReview.summary).toEqual(expect.any(String));
    expect(aiReview.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(aiReview.topics)).toBe(true);
    expect(aiReview.topics.length).toBeGreaterThan(0);
    expect(aiReview.safety).toEqual({
      generatedFromEvidenceOnly: true,
      providerUsed: false,
      model: null,
    });

    const evidenceCheckIds = new Set(
      evidencePacket.findings.map((finding) => finding.checkId),
    );
    for (const topic of aiReview.topics) {
      for (const evidenceCheckId of topic.evidenceCheckIds) {
        expect(evidenceCheckIds.has(evidenceCheckId)).toBe(true);
      }
    }

    expect(evidencePacket.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkId: 'hardcoded-secret',
          status: 'fail',
        }),
        expect.objectContaining({
          checkId: 'permissive-cors',
          status: 'fail',
        }),
        expect.objectContaining({
          checkId: 'committed-env-file',
          status: 'fail',
          safeExcerpt: '.env file detected. Content intentionally hidden.',
        }),
      ]),
    );

    const hardcodedSecretFinding = evidencePacket.findings.find(
      (finding) => finding.checkId === 'hardcoded-secret',
    );
    expect(hardcodedSecretFinding).toBeDefined();
    expect(hardcodedSecretFinding?.codeContext?.length).toBeGreaterThan(0);
    expect(hardcodedSecretFinding?.codeContext?.length).toBeLessThanOrEqual(12);
    expect(hardcodedSecretFinding?.flaggedLineNumber).toBe(2);
    expect(hardcodedSecretFinding?.flaggedLinePointer).toContain('^');
    expect(hardcodedSecretFinding?.flaggedLineExplanation).toEqual(
      'This assignment contains a secret-like value in source code.',
    );
    expect(
      hardcodedSecretFinding?.codeContext?.some((line) => line.isFlaggedLine),
    ).toBe(true);

    const permissiveCorsFinding = evidencePacket.findings.find(
      (finding) => finding.checkId === 'permissive-cors',
    );
    expect(permissiveCorsFinding).toBeDefined();
    expect(permissiveCorsFinding?.filePath).toBe('backend/src/main.ts');
    expect(permissiveCorsFinding?.codeContext?.length).toBeGreaterThan(0);
    expect(permissiveCorsFinding?.codeContext?.length).toBeLessThanOrEqual(12);
    expect(permissiveCorsFinding?.flaggedLineNumber).toBe(3);
    expect(permissiveCorsFinding?.flaggedLinePointer).toContain('^');
    expect(permissiveCorsFinding?.flaggedLineExplanation).toEqual(
      'This CORS configuration may allow broader origin access than intended.',
    );
    expect(permissiveCorsFinding?.githubFileUrl).toBe(
      'https://github.com/RepoOwner/RepoName/blob/main/backend/src/main.ts#L3',
    );
    expect(permissiveCorsFinding?.githubFolderUrl).toBe(
      'https://github.com/RepoOwner/RepoName/tree/main/backend/src',
    );
    expect(permissiveCorsFinding?.recommendationKey).toBe(
      'explicit-cors-origins',
    );
    expect(
      permissiveCorsFinding?.codeContext?.find((line) => line.isFlaggedLine),
    ).toEqual(
      expect.objectContaining({
        lineNumber: 3,
        content: 'app.use(cors({ origin: "*" }));',
      }),
    );
    expect(
      permissiveCorsFinding?.codeContext?.some((line) => line.isFlaggedLine),
    ).toBe(true);

    const envFinding = evidencePacket.findings.find(
      (finding) => finding.checkId === 'committed-env-file',
    );
    expect(envFinding).toBeDefined();
    expect(envFinding?.codeContext).toBeUndefined();
    expect(envFinding?.flaggedLineNumber).toBeUndefined();
    expect(envFinding?.flaggedLinePointer).toBeUndefined();
    expect(envFinding?.flaggedLineExplanation).toBeUndefined();

    for (const finding of evidencePacket.findings) {
      for (const line of finding.codeContext || []) {
        expect(line.lineNumber).toBeGreaterThan(0);
        expect(line.content.length).toBeLessThanOrEqual(120);
      }
    }

    const serializedResponse = JSON.stringify(response);
    expect(serializedResponse).not.toContain(rawSecret);
    expect(aiReview.topics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceCheckIds: ['hardcoded-secret'],
        }),
        expect.objectContaining({
          evidenceCheckIds: ['permissive-cors'],
        }),
      ]),
    );
  });
});
