// ── Shared domain types ──────────────────────────────────────────────────────

export interface DeploymentRepository {
  id: number;
  github_id: string;
  name: string;
  full_name: string;
  branch: string;
  clone_url?: string | null;
  default_branch?: string;
  docker_image_name?: string | null;
}

export type DeploymentConfig = Record<string, Record<string, string>>;

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type DeploymentStatus = 'draft' | 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface StepDetailInit {
  environment_id?: number;
  repositories?: DeploymentRepository[];
  github_step_number?: number;
  run_url?: string;
}

export type StepDetail = StepDetailInit;

// ── Model attribute interfaces ───────────────────────────────────────────────

export interface UserAttributes {
  id: number;
  github_id: string;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  access_token: string | null;
  password?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface EnvironmentAttributes {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  target_branch?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface ServerAttributes {
  id: number;
  user_id: number;
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
  user_id: number;
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
  repositories: DeploymentRepository[];
  config: DeploymentConfig;
  status?: DeploymentStatus;
  notes: string | null;
  deployed_at: Date | null;
  log?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface DeploymentStepAttributes {
  id: number;
  deployment_id: number;
  step_number: number;
  step_name: string;
  status?: StepStatus;
  detail: StepDetail;
  log: string | null;
  started_at: Date | null;
  completed_at: Date | null;
}

// ── Express augmentation ─────────────────────────────────────────────────────

declare global {
  namespace Express {
    // Expose User instance in req.user
    interface User extends UserAttributes {}
  }
}
