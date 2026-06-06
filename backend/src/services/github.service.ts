import { Octokit } from '@octokit/rest';
import { env } from '../config/env';
import { Repository } from '../models/Repository';

export class GitHubService {
  static async syncRepositories(accessToken: string | null) {
    let token = accessToken;
    if (!token && env.github.token && env.github.token !== 'your_github_personal_access_token') {
      token = env.github.token;
    }
    
    const org = env.github.org && env.github.org !== 'your_github_org_or_username' ? env.github.org : null;

    if (!token) {
      throw new Error('GitHub access token is required for synchronization.');
    }

    const octokit = new Octokit({ auth: token });
    let ghRepos: any[] = [];

    if (org) {
      const { data } = await octokit.repos.listForOrg({
        org,
        type: 'all',
        per_page: 100,
      });
      ghRepos = data;
    } else {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        visibility: 'all',
        per_page: 100,
      });
      ghRepos = data;
    }

    const now = new Date();
    const results = await Promise.all(
      ghRepos.map(async (r: any) => {
        const [repo] = await Repository.upsert({
          github_id: String(r.id),
          name: r.name,
          full_name: r.full_name,
          description: r.description,
          url: r.html_url,
          clone_url: r.clone_url,
          language: r.language,
          default_branch: r.default_branch,
          visibility: r.visibility || 'private',
          synced_at: now,
        });
        return repo;
      })
    );

    return results;
  }
}
