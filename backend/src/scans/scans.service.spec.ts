import { ScansService } from './scans.service';

describe('ScansService', () => {
  const service = new ScansService() as unknown as {
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
});

