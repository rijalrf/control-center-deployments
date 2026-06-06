export interface UserAttributes {
  id: number;
  github_id: string;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  access_token: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface EnvironmentAttributes {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface ServerAttributes {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string | null;
  environment_id: number | null;
  status?: 'active' | 'inactive' | 'unknown';
  created_at?: Date;
  updated_at?: Date;
}

export interface RepositoryAttributes {
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
  synced_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface DeploymentAttributes {
  id: number;
  environment_id: number | null;
  user_id: number | null;
  repositories: any;
  config: any;
  status?: 'draft' | 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  notes: string | null;
  deployed_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface DeploymentStepAttributes {
  id: number;
  deployment_id: number;
  step_number: number;
  step_name: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  detail: any;
  log: string | null;
  started_at: Date | null;
  completed_at: Date | null;
}

declare global {
  namespace Express {
    // Expose User instance in req.user
    interface User extends UserAttributes {}
  }
}
