import {
  buildDidacticChecks,
  inferRepositoryContext,
  type RepositoryContext,
} from './scanner-evaluation';
import type { RepositoryCheckResult } from './repositories.types';

describe('scanner-evaluation', () => {
  const baseCheck = (
    overrides: Partial<RepositoryCheckResult>,
  ): RepositoryCheckResult => ({
    key: 'readme',
    label: 'README',
    category: 'basic-health',
    passed: true,
    severity: 'low',
    message: 'README file found.',
    ...overrides,
  });

  it('infers scientific context when docs signals dominate', () => {
    const checks = [
      baseCheck({ key: 'readmeInstructions', passed: true }),
      baseCheck({ key: 'packageJson', passed: false }),
      baseCheck({ key: 'scripts', passed: false }),
      baseCheck({ key: 'testsStructure', passed: false }),
    ];

    const context = inferRepositoryContext(checks, 'owner/paper-study');

    expect(context.primary).toBe('scientific');
    expect(context.confidence).toBe('medium');
  });

  it('builds didactic checks with no global score fields and at least one source', () => {
    const checks = [
      baseCheck({
        key: 'hardcodedSecrets',
        passed: false,
        severity: 'high',
        message: 'Potential secret.',
      }),
    ];

    const context: RepositoryContext = {
      primary: 'fullstack-app',
      secondary: [],
      confidence: 'high',
      signals: ['package-json'],
    };

    const results = buildDidacticChecks(checks, context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      status: 'red',
      confidence: 'high',
    });
    expect(results[0].what_checked).toBeTruthy();
    expect(results[0].why_it_matters).toBeTruthy();
    expect(results[0].what_found).toBeTruthy();
    expect(results[0].suggested_action).toBeTruthy();
    expect(results[0].sources.length).toBeGreaterThanOrEqual(1);
  });

  it('marks ambiguity when confidence is low', () => {
    const checks = [
      baseCheck({ key: 'openIssues', passed: false, severity: 'low' }),
    ];

    const context: RepositoryContext = {
      primary: 'unknown',
      secondary: [],
      confidence: 'low',
      signals: [],
    };

    const results = buildDidacticChecks(checks, context);

    expect(results[0].uncertainty_note).toContain('manual');
    expect(results[0].status).toBe('yellow');
  });
});
