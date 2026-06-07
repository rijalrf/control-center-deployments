// ── Primitive types ───────────────────────────────────────────────────────────

export type DeploymentStatus = 'draft' | 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// ── Domain models ─────────────────────────────────────────────────────────────

export interface User {
  id: number;
  github_id: string;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  password?: string | null;
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
  target_branch?: string | null;
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
  branch?: string;
  fallback_used?: boolean;
}

export interface DeploymentRepository {
  github_id: string;
  name: string;
  full_name: string;
  branch: string;
  clone_url?: string | null;
  default_branch?: string;
}

export type DeploymentConfig = Record<string, Record<string, string>>;

/** Typed shape for step detail stored in DeploymentStep.detail */
export interface StepDetail {
  environment_id?: number;
  repositories?: DeploymentRepository[];
  github_step_number?: number;
  run_url?: string;
  config?: DeploymentConfig;
}

export interface DeploymentStep {
  id: number;
  deployment_id: number;
  step_number: number;
  step_name: string;
  status: StepStatus;
  detail: StepDetail;
  log: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface Deployment {
  id: number;
  environment_id: number | null;
  user_id: number | null;
  repositories: DeploymentRepository[];
  config: DeploymentConfig;
  status: DeploymentStatus;
  notes: string | null;
  deployed_at: string | null;
  log?: string | null;
  created_at: string;
  updated_at: string;
  /** Sequelize alias — same as created_at */
  createdAt?: string;
  /** Sequelize alias — same as updated_at */
  updatedAt?: string;
  environment?: Environment;
  user?: User;
  steps?: DeploymentStep[];
}
