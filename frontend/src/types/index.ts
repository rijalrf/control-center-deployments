export interface User {
  id: number;
  github_id: string;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string | null;
  environment_id: number | null;
  status: 'active' | 'inactive' | 'unknown';
  environment?: Environment;
  created_at?: string;
  updated_at?: string;
}

export interface Environment {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  servers?: Server[];
  created_at?: string;
  updated_at?: string;
}

export interface Repository {
  id: number;
  github_id: string;
  name: string;
  full_name: string;
  description: string | null;
  url: string | null;
  clone_url: string | null;
  language: string | null;
  default_branch: string;
  visibility: string;
  synced_at: string | null;
}

export interface DeploymentStep {
  id: number;
  deployment_id: number;
  step_number: number;
  step_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  detail: any;
  log: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface Deployment {
  id: number;
  environment_id: number | null;
  user_id: number | null;
  repositories: {
    github_id: string;
    name: string;
    full_name: string;
    branch: string;
  }[];
  config: Record<string, Record<string, string>>; // repoName -> { key: value }
  status: 'draft' | 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  notes: string | null;
  deployed_at: string | null;
  log?: string | null;
  created_at: string;
  updated_at: string;
  createdAt?: string;
  updatedAt?: string;
  environment?: Environment;
  user?: User;
  steps?: DeploymentStep[];
}
