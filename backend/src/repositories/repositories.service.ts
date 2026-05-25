import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Session, SessionData } from 'express-session';
import type {
  GithubRepositoryResponse,
  ListRepositoriesResponse,
} from './repositories.types';

type AppSession = Session & Partial<SessionData>;

@Injectable()
export class RepositoriesService {
  async listAuthenticatedPublicRepositories(
    session: AppSession,
  ): Promise<ListRepositoriesResponse> {
    const accessToken = session.githubAccessToken;
    const githubUser = session.githubUser;

    if (!accessToken || !githubUser) {
      throw new UnauthorizedException('Authentication required.');
    }

    const endpoint = new URL('https://api.github.com/user/repos');
    endpoint.searchParams.set('visibility', 'public');
    endpoint.searchParams.set('sort', 'updated');
    endpoint.searchParams.set('direction', 'desc');
    endpoint.searchParams.set('per_page', '100');

    const githubResponse = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'RepoGuard',
      },
    });

    if (githubResponse.status === 401 || githubResponse.status === 403) {
      throw new UnauthorizedException('GitHub session expired. Please reconnect.');
    }

    if (!githubResponse.ok) {
      throw new BadGatewayException('Could not load repositories from GitHub.');
    }

    const repositoriesPayload =
      (await githubResponse.json()) as GithubRepositoryResponse[];

    if (!Array.isArray(repositoriesPayload)) {
      throw new BadGatewayException('Unexpected repositories response.');
    }

    const repositories = repositoriesPayload
      .filter((repository) => repository.private === false)
      .map((repository) => ({
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        htmlUrl: repository.html_url,
        description: repository.description,
        language: repository.language,
        private: repository.private,
        fork: repository.fork,
        archived: repository.archived,
        defaultBranch: repository.default_branch,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        openIssues: repository.open_issues_count,
        pushedAt: repository.pushed_at,
        updatedAt: repository.updated_at,
      }));

    return { repositories };
  }
}
