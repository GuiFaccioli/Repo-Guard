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
      'import { NestFactory } from "@nestjs/core";',
      `const apiKey = "${rawSecret}";`,
      'app.enableCors({ origin: "*" });',
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
      'This is the CORS configuration RepoGuard flagged for review.',
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
        content: 'app.enableCors({ origin: "*" });',
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

  it('should flag app.enableCors() default usage with review evidence context', async () => {
    const mockFileContent = [
      'const app = await NestFactory.create(AppModule);',
      'app.enableCors();',
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
          tree: [{ path: 'backend/src/main.ts' }],
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
      ['security_basics'],
    );

    const securityBasics = response.results.find(
      (result) => result.checklist === 'security_basics',
    );
    const permissiveCorsItem = securityBasics?.items.find(
      (item) => item.label === 'Permissive CORS configuration',
    );

    expect(permissiveCorsItem).toBeDefined();
    expect(permissiveCorsItem?.status).toBe('fail');
    expect(permissiveCorsItem?.details).toBe('CORS configuration may need review.');
    expect(permissiveCorsItem?.filePath).toBe('backend/src/main.ts');
    expect(permissiveCorsItem?.lineNumber).toBe(2);
    expect(permissiveCorsItem?.codeContext?.length).toBeGreaterThan(0);
    expect(permissiveCorsItem?.codeContext?.length).toBeLessThanOrEqual(12);
    expect(permissiveCorsItem?.flaggedLineNumber).toBe(2);
    expect(permissiveCorsItem?.flaggedLinePointer).toContain('^');
    expect(permissiveCorsItem?.flaggedLineExplanation).toBe(
      'This is the CORS configuration RepoGuard flagged for review.',
    );
    expect(permissiveCorsItem?.githubFileUrl).toBe(
      'https://github.com/RepoOwner/RepoName/blob/main/backend/src/main.ts#L2',
    );
    expect(
      permissiveCorsItem?.codeContext?.some((line) => line.isFlaggedLine),
    ).toBe(true);
  });

  it('should ignore test/example/docs fixtures in code safety checks while preserving production findings and .env detection', async () => {
    const fileContents: Record<string, string> = {
      'backend/src/main.ts': [
        'import { NestFactory } from "@nestjs/core";',
        'const app = await NestFactory.create(AppModule);',
        'app.enableCors({ origin: "*" });',
      ].join('\n'),
      'backend/src/users.ts': [
        'const userId = input.id;',
        "const query = 'SELECT * FROM users WHERE id = ' + userId;",
      ].join('\n'),
      'backend/src/users.spec.ts': [
        'describe("users", () => {',
        "  const query = 'SELECT * FROM users WHERE id = ' + userId;",
        '});',
      ].join('\n'),
      'backend/src/scans/safe-evidence-packet.spec.ts': [
        'describe("fixtures", () => {',
        "  const rawSecret = 'TRAINING_SECRET_VALUE_ABC123XYZ789';",
        '  app.enableCors({ origin: "*" });',
        '});',
      ].join('\n'),
      'docs/examples/security-guide.ts': [
        'export function risky() {',
        '  return eval(payload);',
        '}',
      ].join('\n'),
    };

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
            { path: 'backend/src/users.ts' },
            { path: 'backend/src/users.spec.ts' },
            { path: 'backend/src/scans/safe-evidence-packet.spec.ts' },
            { path: 'docs/examples/security-guide.ts' },
            { path: '.env' },
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
        const matchedEntry = Object.entries(fileContents).find(([path]) =>
          url.includes(`/${path}`),
        );
        if (!matchedEntry) {
          throw new Error(`Unexpected raw file URL in test: ${url}`);
        }

        return toTextResponse(matchedEntry[1]);
      }

      throw new Error(`Unexpected fetch URL in test: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await scansService.runScan(
      'https://github.com/RepoOwner/RepoName',
      ['security_basics'],
    );

    const securityBasics = response.results.find(
      (result) => result.checklist === 'security_basics',
    );
    expect(securityBasics).toBeDefined();

    const getItem = (label: string) =>
      securityBasics?.items.find((item) => item.label === label);

    expect(getItem('Permissive CORS configuration')?.status).toBe('fail');
    expect(getItem('Permissive CORS configuration')?.filePath).toBe(
      'backend/src/main.ts',
    );
    expect(getItem('SQL query built with string concatenation')?.status).toBe(
      'fail',
    );
    expect(getItem('SQL query built with string concatenation')?.filePath).toBe(
      'backend/src/users.ts',
    );
    expect(getItem('Possible hardcoded secret')?.status).toBe('pass');
    expect(getItem('No eval usage detected')?.status).toBe('pass');
    expect(getItem('Environment file committed')?.status).toBe('fail');

    expect(response.evidencePacket).toBeDefined();
    expect(response.aiReview).toBeDefined();

    const failedFindingCheckIds = response.evidencePacket!.findings
      .filter((finding) => finding.status === 'fail')
      .map((finding) => finding.checkId);

    expect(failedFindingCheckIds).toEqual(
      expect.arrayContaining([
        'permissive-cors',
        'sql-string-concatenation',
        'committed-env-file',
      ]),
    );
    expect(failedFindingCheckIds).not.toContain('hardcoded-secret');
    expect(failedFindingCheckIds).not.toContain('eval-usage');
    expect(
      response.evidencePacket!.findings
        .filter((finding) => finding.status === 'fail')
        .map((finding) => finding.filePath),
    ).not.toEqual(
      expect.arrayContaining([
        'backend/src/users.spec.ts',
        'backend/src/scans/safe-evidence-packet.spec.ts',
        'docs/examples/security-guide.ts',
      ]),
    );

    const envFinding = response.evidencePacket!.findings.find(
      (finding) => finding.checkId === 'committed-env-file',
    );
    expect(envFinding?.status).toBe('fail');
    expect(envFinding?.safeExcerpt).toBe(
      '.env file detected. Content intentionally hidden.',
    );

    const aiReviewCheckIds = new Set(
      response.aiReview!.topics.flatMap((topic) => topic.evidenceCheckIds),
    );
    expect(aiReviewCheckIds.has('hardcoded-secret')).toBe(false);
    expect(aiReviewCheckIds.has('eval-usage')).toBe(false);
    expect(aiReviewCheckIds.has('permissive-cors')).toBe(true);
    expect(aiReviewCheckIds.has('sql-string-concatenation')).toBe(true);
    expect(aiReviewCheckIds.has('committed-env-file')).toBe(true);
  });

  it('should ignore internal slug and label values in hardcoded-secret detection', async () => {
    const mockFileContent = [
      'const internalChecks = {',
      "  possiblehardcodedsecret: 'hardcoded-secret',",
      "  checkId: 'hardcoded-secret',",
      "  guideId: 'hardcoded-secret',",
      "  recommendationKey: 'move-secret-to-env',",
      "  route: '/checks/hardcoded-secret',",
      "  title: 'Possible hardcoded secret',",
      "  label: 'Learn about hardcoded secrets',",
      '};',
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
          tree: [{ path: 'backend/src/scans/safe-evidence-packet.ts' }],
        });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:issue')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:pr')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (url.includes('https://raw.githubusercontent.com/')) {
        return toTextResponse(mockFileContent);
      }

      throw new Error(`Unexpected fetch URL in test: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await scansService.runScan(
      'https://github.com/RepoOwner/RepoName',
      ['security_basics'],
    );

    const securityBasics = response.results.find(
      (result) => result.checklist === 'security_basics',
    );
    const hardcodedSecretItem = securityBasics?.items.find(
      (item) => item.label === 'Possible hardcoded secret',
    );

    expect(hardcodedSecretItem?.status).toBe('pass');
    expect(JSON.stringify(hardcodedSecretItem)).not.toContain('hardcoded-secret');

    const failedFindingCheckIds = response.evidencePacket!.findings
      .filter((finding) => finding.status === 'fail')
      .map((finding) => finding.checkId);
    expect(failedFindingCheckIds).not.toContain('hardcoded-secret');

    const hardcodedSecretFinding = response.evidencePacket!.findings.find(
      (finding) => finding.checkId === 'hardcoded-secret',
    );
    expect(hardcodedSecretFinding?.status).toBe('pass');
    expect(hardcodedSecretFinding?.safeExcerpt).toBeUndefined();
    expect(hardcodedSecretFinding?.filePath).toBeUndefined();

    const aiReviewCheckIds = new Set(
      response.aiReview!.topics.flatMap((topic) => topic.evidenceCheckIds),
    );
    expect(aiReviewCheckIds.has('hardcoded-secret')).toBe(false);
    expect(JSON.stringify(response.aiReview)).not.toContain('hardcoded-secret');
  });

  it('should flag jwt.sign without expiration and include safe evidence plus ai review topic', async () => {
    const rawJwtSecret = 'TEST_SECRET_VALUE_SHOULD_BE_MASKED';
    const mockFileContent = [
      'import jwt from "jsonwebtoken";',
      'const payload = { id: user.id };',
      `const token = jwt.sign(payload, "${rawJwtSecret}");`,
      'return token;',
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
          tree: [{ path: 'backend/src/auth.ts' }],
        });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:issue')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:pr')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (url.includes('https://raw.githubusercontent.com/')) {
        return toTextResponse(mockFileContent);
      }

      throw new Error(`Unexpected fetch URL in test: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await scansService.runScan(
      'https://github.com/RepoOwner/RepoName',
      ['security_basics'],
    );
    const securityBasics = response.results.find(
      (result) => result.checklist === 'security_basics',
    );
    const jwtItem = securityBasics?.items.find(
      (item) => item.label === 'JWT token may be missing expiration',
    );

    expect(jwtItem?.status).toBe('fail');
    expect(jwtItem?.details).toBe(
      'A JWT token appears to be created without an expiration time.',
    );
    expect(jwtItem?.filePath).toBe('backend/src/auth.ts');
    expect(jwtItem?.lineNumber).toBe(3);
    expect(jwtItem?.codeExcerpt).toContain('TEST********');
    expect(jwtItem?.flaggedLineNumber).toBe(3);
    expect(jwtItem?.flaggedLinePointer).toContain('^');
    expect(jwtItem?.flaggedLineExplanation).toBe(
      'This JWT appears to be created without an expiration option.',
    );
    expect(jwtItem?.codeContext?.length).toBeGreaterThan(0);
    expect(jwtItem?.codeContext?.length).toBeLessThanOrEqual(12);
    expect(jwtItem?.codeContext?.some((line) => line.isFlaggedLine)).toBe(true);

    const jwtFinding = response.evidencePacket!.findings.find(
      (finding) =>
        finding.checkId === 'jwt-without-expiration' &&
        finding.status === 'fail',
    );
    expect(jwtFinding).toMatchObject({
      checkId: 'jwt-without-expiration',
      status: 'fail',
      filePath: 'backend/src/auth.ts',
      lineNumber: 3,
      flaggedLineNumber: 3,
      flaggedLineExplanation:
        'This JWT appears to be created without an expiration option.',
    });
    expect(jwtFinding?.codeContext?.length).toBeGreaterThan(0);

    expect(
      response.aiReview!.topics.some((topic) =>
        topic.evidenceCheckIds.includes('jwt-without-expiration'),
      ),
    ).toBe(true);

    const serializedResponse = JSON.stringify(response);
    expect(serializedResponse).not.toContain(rawJwtSecret);
  });

  it('should pass JWT expiration check when expiresIn is provided', async () => {
    const mockFileContent = [
      'import jwt from "jsonwebtoken";',
      'const payload = { id: user.id };',
      'const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });',
      'return token;',
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
          tree: [{ path: 'backend/src/auth.ts' }],
        });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:issue')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:pr')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (url.includes('https://raw.githubusercontent.com/')) {
        return toTextResponse(mockFileContent);
      }

      throw new Error(`Unexpected fetch URL in test: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await scansService.runScan(
      'https://github.com/RepoOwner/RepoName',
      ['security_basics'],
    );
    const securityBasics = response.results.find(
      (result) => result.checklist === 'security_basics',
    );
    const jwtPassItem = securityBasics?.items.find(
      (item) => item.label === 'JWT token expiration configured',
    );

    expect(jwtPassItem?.status).toBe('pass');
    expect(jwtPassItem?.details).toBe(
      'RepoGuard did not find obvious JWT signing without expiration in sampled files.',
    );
    expect(
      response.evidencePacket!.findings.some(
        (finding) =>
          finding.checkId === 'jwt-without-expiration' &&
          finding.status === 'fail',
      ),
    ).toBe(false);
    expect(
      response.aiReview!.topics.some((topic) =>
        topic.evidenceCheckIds.includes('jwt-without-expiration'),
      ),
    ).toBe(false);
  });

  it('should flag jsonwebtoken.sign without expiration', async () => {
    const rawJwtSecret = 'FAKE_TEST_SECRET_VALUE_123456';
    const mockFileContent = [
      'const jsonwebtoken = require("jsonwebtoken");',
      'const payload = { id: user.id };',
      `const token = jsonwebtoken.sign(payload, "${rawJwtSecret}");`,
      'return token;',
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
          tree: [{ path: 'backend/src/auth.ts' }],
        });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:issue')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:pr')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (url.includes('https://raw.githubusercontent.com/')) {
        return toTextResponse(mockFileContent);
      }

      throw new Error(`Unexpected fetch URL in test: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await scansService.runScan(
      'https://github.com/RepoOwner/RepoName',
      ['security_basics'],
    );
    const securityBasics = response.results.find(
      (result) => result.checklist === 'security_basics',
    );
    const jwtItem = securityBasics?.items.find(
      (item) => item.label === 'JWT token may be missing expiration',
    );

    expect(jwtItem?.status).toBe('fail');
    expect(jwtItem?.filePath).toBe('backend/src/auth.ts');
    expect(jwtItem?.lineNumber).toBe(3);
    expect(jwtItem?.codeExcerpt).toContain('FAKE********');
    expect(
      response.evidencePacket!.findings.some(
        (finding) =>
          finding.checkId === 'jwt-without-expiration' &&
          finding.status === 'fail',
      ),
    ).toBe(true);
    expect(
      response.aiReview!.topics.some((topic) =>
        topic.evidenceCheckIds.includes('jwt-without-expiration'),
      ),
    ).toBe(true);
    expect(JSON.stringify(response)).not.toContain(rawJwtSecret);
  });

  it('should ignore JWT patterns in .spec.ts files', async () => {
    const mockFileContent = [
      'import jwt from "jsonwebtoken";',
      'describe("auth", () => {',
      '  const payload = { id: 1 };',
      '  const token = jwt.sign(payload, "NOT_A_REAL_TOKEN_FOR_TEST_ONLY");',
      '});',
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
          tree: [{ path: 'backend/src/auth.spec.ts' }],
        });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:issue')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:pr')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (url.includes('https://raw.githubusercontent.com/')) {
        return toTextResponse(mockFileContent);
      }

      throw new Error(`Unexpected fetch URL in test: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await scansService.runScan(
      'https://github.com/RepoOwner/RepoName',
      ['security_basics'],
    );
    const securityBasics = response.results.find(
      (result) => result.checklist === 'security_basics',
    );
    const jwtPassItem = securityBasics?.items.find(
      (item) => item.label === 'JWT token expiration configured',
    );

    expect(jwtPassItem?.status).toBe('pass');
    expect(
      response.evidencePacket!.findings.some(
        (finding) =>
          finding.checkId === 'jwt-without-expiration' &&
          finding.status === 'fail',
      ),
    ).toBe(false);
    expect(
      response.aiReview!.topics.some((topic) =>
        topic.evidenceCheckIds.includes('jwt-without-expiration'),
      ),
    ).toBe(false);
  });

  it('should still detect real-looking hardcoded apiKey values', async () => {
    const mockFileContent = [
      'const config = {',
      '  apiKey: "AlphaBetaGammaDelta1234567890",',
      '};',
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
          tree: [{ path: 'backend/src/config.ts' }],
        });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:issue')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:pr')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (url.includes('https://raw.githubusercontent.com/')) {
        return toTextResponse(mockFileContent);
      }

      throw new Error(`Unexpected fetch URL in test: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await scansService.runScan(
      'https://github.com/RepoOwner/RepoName',
      ['security_basics'],
    );
    const securityBasics = response.results.find(
      (result) => result.checklist === 'security_basics',
    );
    const hardcodedSecretItem = securityBasics?.items.find(
      (item) => item.label === 'Possible hardcoded secret',
    );

    expect(hardcodedSecretItem?.status).toBe('fail');
    expect(hardcodedSecretItem?.codeExcerpt).toContain('Alph********');
    expect(
      response.evidencePacket!.findings.some(
        (finding) =>
          finding.checkId === 'hardcoded-secret' && finding.status === 'fail',
      ),
    ).toBe(true);
    expect(
      response.aiReview!.topics.some((topic) =>
        topic.evidenceCheckIds.includes('hardcoded-secret'),
      ),
    ).toBe(true);
  });

  it('should still detect real-looking hardcoded token values', async () => {
    const mockFileContent = [
      'const auth = {',
      '  token: "QwertyTokenValue987654321XyZ",',
      '};',
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
          tree: [{ path: 'backend/src/auth.ts' }],
        });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:issue')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (
        url.includes('https://api.github.com/search/issues') &&
        url.includes('is:pr')
      ) {
        return toJsonResponse({ total_count: 0 });
      }

      if (url.includes('https://raw.githubusercontent.com/')) {
        return toTextResponse(mockFileContent);
      }

      throw new Error(`Unexpected fetch URL in test: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await scansService.runScan(
      'https://github.com/RepoOwner/RepoName',
      ['security_basics'],
    );
    const securityBasics = response.results.find(
      (result) => result.checklist === 'security_basics',
    );
    const hardcodedSecretItem = securityBasics?.items.find(
      (item) => item.label === 'Possible hardcoded secret',
    );

    expect(hardcodedSecretItem?.status).toBe('fail');
    expect(hardcodedSecretItem?.codeExcerpt).toContain('Qwer********');
    expect(
      response.evidencePacket!.findings.some(
        (finding) =>
          finding.checkId === 'hardcoded-secret' && finding.status === 'fail',
      ),
    ).toBe(true);
    expect(
      response.aiReview!.topics.some((topic) =>
        topic.evidenceCheckIds.includes('hardcoded-secret'),
      ),
    ).toBe(true);
  });
});
