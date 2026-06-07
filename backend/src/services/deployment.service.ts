import { Deployment } from '../models/Deployment';
import { DeploymentStep } from '../models/DeploymentStep';
import { Environment } from '../models/Environment';
import { Server } from '../models/Server';
import { GitHubService } from './github.service';
import {
  DeploymentRepository,
  DeploymentConfig,
  DeploymentStatus,
  StepStatus,
  StepDetail,
  DeploymentStepAttributes,
} from '../types';

// ── Internal types ────────────────────────────────────────────────────────────

interface RunInfo {
  owner: string;
  repo: string;
  workflowId: string;
  dispatchTime: Date;
  repoName: string;
  runId: number | null;
  status: string;
  conclusion: string | null;
  jobId: number | null;
  htmlUrl: string;
}

interface StartDeploymentData {
  environment_id: number;
  repositories: DeploymentRepository[];
  config: DeploymentConfig;
}

interface CreateDeploymentInput extends StartDeploymentData {
  user_id: number;
  notes?: string;
  accessToken: string;
  status?: string;
}

interface GitHubStep {
  name: string;
  number: number;
  status: string | null;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Maps GitHub Actions step status/conclusion → internal StepStatus. */
function mapStepStatus(ghStatus: string | null, ghConclusion: string | null): StepStatus {
  if (ghStatus === 'queued')      return 'pending';
  if (ghStatus === 'in_progress') return 'running';
  if (ghStatus === 'completed') {
    if (ghConclusion === 'success') return 'completed';
    if (ghConclusion === 'skipped') return 'skipped';
    return 'failed'; // failure | cancelled | timed_out | action_required
  }
  return 'pending';
}

/** Returns the standard 6-step pipeline definition. */
function buildStandardSteps(isRunning: boolean): Array<{
  step_number: number;
  step_name: string;
  status: StepStatus;
  log: string | null;
}> {
  return [
    {
      step_number: 1,
      step_name:   'Initializing Deployment Pipeline',
      status:      isRunning ? 'running' : 'pending',
      log:         isRunning ? 'Preparing deployment and triggering GitHub Actions workflow...' : null,
    },
    { step_number: 2, step_name: 'Fetching Source Code from Repository',    status: 'pending', log: null },
    { step_number: 3, step_name: 'Building Application Container Image',     status: 'pending', log: null },
    { step_number: 4, step_name: 'Uploading Image to Docker Hub Registry',   status: 'pending', log: null },
    { step_number: 5, step_name: 'Configuring Server Environment & Assets',  status: 'pending', log: null },
    { step_number: 6, step_name: 'Deploying Container & Verifying Service',  status: 'pending', log: null },
  ];
}

/** Builds the bulk-create payload for deployment steps. */
function buildStepRows(
  steps: ReturnType<typeof buildStandardSteps>,
  deploymentId: number,
  initDetail: StepDetail,
): Omit<DeploymentStepAttributes, 'id'>[] {
  const now = new Date();
  return steps.map((s) => ({
    deployment_id: deploymentId,
    step_number:   s.step_number,
    step_name:     s.step_name,
    status:        s.status,
    log:           s.log,
    started_at:    s.status === 'running' ? now : null,
    completed_at:  null,
    detail:        s.step_number === 1 ? initDetail : {} as StepDetail,
  }));
}

// ── Service ───────────────────────────────────────────────────────────────────

export class DeploymentService {
  static async createDeployment(data: CreateDeploymentInput): Promise<Deployment> {
    const isDraft = data.status === 'draft';

    const deployment = await Deployment.create({
      environment_id: data.environment_id,
      user_id:        data.user_id,
      repositories:   data.repositories,
      config:         data.config ?? {},
      status:         (isDraft ? 'draft' : 'pending') as DeploymentStatus,
      notes:          data.notes ?? null,
      deployed_at:    null,
    });

    const initDetail: StepDetail = {
      environment_id: data.environment_id,
      repositories:   data.repositories,
    };
    const steps = buildStandardSteps(!isDraft);
    await DeploymentStep.bulkCreate(buildStepRows(steps, deployment.id, initDetail));

    if (!isDraft) {
      void this.startGitHubActionsDeployment(deployment.id, data.accessToken, data);
    }

    return deployment;
  }

  // ── Private: launch GitHub Actions ─────────────────────────────────────────

  private static async startGitHubActionsDeployment(
    deploymentId: number,
    accessToken: string,
    data: StartDeploymentData,
  ): Promise<void> {
    try {
      const envObj         = await Environment.findByPk(data.environment_id);
      const envName        = envObj?.name ?? 'staging';
      const server         = await Server.findOne({ where: { environment_id: data.environment_id } });
      const serverHost     = server?.host ?? 'localhost';
      const serverUsername = server?.username ?? 'deploy';
      const envSuffix      = envName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

      const runsInfo: RunInfo[] = [];

      for (const r of data.repositories) {
        const repoConfig    = data.config[r.name] ?? {};
        const dockerfilePath = repoConfig['DOCKERFILE_PATH'] ?? 'Dockerfile';
        const [repoOwner, repoNameOnly] = r.full_name.split('/');

        let targetRef = r.default_branch ?? 'main';
        const configuredBranch = envObj?.target_branch;

        if (configuredBranch && configuredBranch.trim() !== '') {
          const hasConfiguredBranch = await GitHubService.checkBranchExists(accessToken, repoOwner, repoNameOnly, configuredBranch);
          if (hasConfiguredBranch) {
            targetRef = configuredBranch;
          }
        } else {
          if (envName.toLowerCase() === 'production') {
            const hasMain = await GitHubService.checkBranchExists(accessToken, repoOwner, repoNameOnly, 'main');
            if (hasMain) targetRef = 'main';
          } else {
            const hasStaging = await GitHubService.checkBranchExists(accessToken, repoOwner, repoNameOnly, 'staging');
            if (hasStaging) targetRef = 'staging';
          }
        }

        const targetInputs: Record<string, string> = {
          target_repo_url:         r.clone_url ?? `https://github.com/${r.full_name}.git`,
          target_repo_name:        r.name,
          target_repo_path:        r.full_name,
          target_ref:              targetRef,
          environment:             envName,
          environment_secret_suffix: envSuffix,
          config:                  JSON.stringify(repoConfig),
          server_host:             serverHost,
          server_username:         serverUsername,
          dockerfile_path:         dockerfilePath,
        };

        const runMeta = await GitHubService.dispatchCentralWorkflow(accessToken, targetInputs, 'main');
        runsInfo.push({
          ...runMeta,
          repoName:   r.name,
          runId:      null,
          status:     'queued',
          conclusion: null,
          jobId:      null,
          htmlUrl:    '',
        });
      }

      await DeploymentStep.update(
        {
          status:       'completed',
          completed_at: new Date(),
          log:          `Workflow GitHub Actions berhasil dipicu untuk ${runsInfo.length} repositori.`,
        },
        { where: { deployment_id: deploymentId, step_number: 1 } },
      );

      this.pollGitHubActionsProgress(deploymentId, accessToken, runsInfo);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Gagal memulai deployment via GitHub Actions:', err);
      await Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
      await DeploymentStep.update(
        { status: 'failed', completed_at: new Date(), log: `Gagal memicu workflow GitHub Actions: ${message}` },
        { where: { deployment_id: deploymentId, step_number: 1 } },
      );
    }
  }

  // ── Private: poll progress ──────────────────────────────────────────────────

  private static pollGitHubActionsProgress(
    deploymentId: number,
    accessToken: string,
    runsInfo: RunInfo[],
  ): void {
    const INTERVAL_MS  = 4_000;
    const MAX_RETRIES  = 150; // ~10 minutes
    let retries        = 0;
    let stepsInitialized = false;

    const runsMap: RunInfo[] = runsInfo.map((r) => ({ ...r }));

    const timer = setInterval(async () => {
      try {
        retries++;
        if (retries > MAX_RETRIES) {
          clearInterval(timer);
          await Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
          await DeploymentStep.update(
            { status: 'failed', completed_at: new Date(), log: 'Timeout: pelacakan dibatalkan setelah 10 menit.' },
            { where: { deployment_id: deploymentId, status: ['pending', 'running'] } },
          );
          return;
        }

        // 1. Discover run IDs
        for (const run of runsMap) {
          if (!run.runId) {
            const githubRun = await GitHubService.findWorkflowRun(
              accessToken, run.owner, run.repo, run.workflowId, run.dispatchTime,
            );
            if (githubRun) {
              run.runId     = githubRun.id;
              run.status    = githubRun.status ?? 'queued';
              run.conclusion = githubRun.conclusion;
            }
          }
        }

        const allFound = runsMap.every((r) => r.runId !== null);
        if (!allFound) return; // wait until all runs discovered

        // 2. Use first run as reference for step tracking
        const firstRun = runsMap[0];
        const jobs     = await GitHubService.getWorkflowRunJobs(
          accessToken, firstRun.owner, firstRun.repo, firstRun.runId!,
        );

        if (!jobs.length) return;

        const job              = jobs[0];
        const ghSteps          = job.steps ?? [];
        firstRun.jobId         = job.id;
        firstRun.htmlUrl       = job.html_url ?? '';

        // Update run-level status
        const runStatus    = await GitHubService.getWorkflowRunStatus(
          accessToken, firstRun.owner, firstRun.repo, firstRun.runId!,
        );
        firstRun.status    = runStatus.status    ?? firstRun.status;
        firstRun.conclusion = runStatus.conclusion ?? firstRun.conclusion;

        // 3. Sync GitHub steps to DB
        if (ghSteps.length > 0) {
          if (!stepsInitialized) {
            stepsInitialized = true;
            await Deployment.update({ status: 'running' }, { where: { id: deploymentId } });
          }

          for (const ghStep of ghSteps) {
            const newStatus    = mapStepStatus(ghStep.status, ghStep.conclusion);
            const existingStep = await DeploymentStep.findOne({
              where: { deployment_id: deploymentId, step_name: ghStep.name },
            });

            if (!existingStep) continue;

            const stepUpdates: Partial<{
              status: StepStatus;
              started_at: Date;
              completed_at: Date;
              detail: StepDetail;
              log: string;
            }> = {
              status:       newStatus,
              started_at:   ghStep.started_at   ? new Date(ghStep.started_at)   : existingStep.started_at   ?? undefined,
              completed_at: ghStep.completed_at  ? new Date(ghStep.completed_at) : existingStep.completed_at ?? undefined,
              detail: {
                ...(existingStep.detail ?? {}),
                github_step_number: ghStep.number,
                run_url:            firstRun.htmlUrl,
              },
            };

            // Generate simulated log if we don't have real logs yet
            if (
              existingStep.step_number !== 1 &&
              (!existingStep.log || existingStep.status !== newStatus || existingStep.log.includes('Executing step...'))
            ) {
              stepUpdates.log = this.generateMockLog(ghStep.name, newStatus, firstRun.repo);
            }

            await existingStep.update(stepUpdates);
          }

          // 4. Replace mock logs with real GitHub job logs
          try {
            const logs = await GitHubService.getJobLogs(accessToken, firstRun.owner, firstRun.repo, firstRun.jobId!);
            if (logs && !logs.startsWith('Tidak dapat mengambil log dari GitHub API')) {
              await Deployment.update({ log: logs }, { where: { id: deploymentId } });

              const parsedLogs = this.parseGithubLogs(logs);
              const dbSteps    = await DeploymentStep.findAll({ where: { deployment_id: deploymentId } });
              for (const dbStep of dbSteps) {
                if (dbStep.step_number === 1) continue; // step 1 has local info
                const stepLog = parsedLogs[dbStep.step_name];
                if (stepLog) await dbStep.update({ log: stepLog });
              }
            }
          } catch (logErr: unknown) {
            console.error('Failed to update step logs:', logErr instanceof Error ? logErr.message : logErr);
          }
        }

        // 5. Check if any workflow failed
        const anyFailed = runsMap.some(
          (r) => r.conclusion === 'failure' || r.conclusion === 'cancelled' || r.conclusion === 'timed_out',
        );

        if (anyFailed) {
          clearInterval(timer);
          await Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
          // Update all remaining non-completed steps of this deployment to failed
          await DeploymentStep.update(
            { status: 'failed', completed_at: new Date() },
            { where: { deployment_id: deploymentId, status: ['pending', 'running'] } },
          );
          return;
        }

        const allCompleted = runsMap.every((r) => r.status === 'completed');
        if (allCompleted) {
          clearInterval(timer);
          await Deployment.update({ status: 'success', deployed_at: new Date() }, { where: { id: deploymentId } });
        }
      } catch (err: unknown) {
        console.error('Error saat polling deployment:', err instanceof Error ? err.message : err);
      }
    }, INTERVAL_MS);
  }

  // ── Private: reset & restart helper (DRY) ──────────────────────────────────

  private static async resetAndStartDeployment(
    deployment: Deployment,
    accessToken: string,
  ): Promise<void> {
    const deploymentId = deployment.id;

    await DeploymentStep.destroy({ where: { deployment_id: deploymentId } });

    const initDetail: StepDetail = {
      environment_id: deployment.environment_id ?? undefined,
      repositories:   deployment.repositories,
    };
    const steps = buildStandardSteps(true);
    await DeploymentStep.bulkCreate(buildStepRows(steps, deploymentId, initDetail));

    const data: StartDeploymentData = {
      environment_id: deployment.environment_id!,
      repositories:   deployment.repositories ?? [],
      config:         deployment.config ?? {},
    };

    void this.startGitHubActionsDeployment(deploymentId, accessToken, data);
  }

  // ── Public: execute draft ───────────────────────────────────────────────────

  static async executeDraftDeployment(deploymentId: number, accessToken: string): Promise<Deployment> {
    const deployment = await Deployment.findByPk(deploymentId, {
      include: [{ model: DeploymentStep, as: 'steps' }],
    });

    if (!deployment)                     throw new Error('Deployment not found');
    if (deployment.status !== 'draft')   throw new Error('Deployment is not a draft and cannot be executed');

    await deployment.update({ status: 'pending', deployed_at: null });
    await this.resetAndStartDeployment(deployment, accessToken);
    return deployment;
  }

  // ── Public: retry ───────────────────────────────────────────────────────────

  static async retryDeployment(deploymentId: number, accessToken: string): Promise<Deployment> {
    const deployment = await Deployment.findByPk(deploymentId, {
      include: [{ model: DeploymentStep, as: 'steps' }],
    });

    if (!deployment) throw new Error('Deployment not found');
    if (deployment.status !== 'failed' && deployment.status !== 'cancelled') {
      throw new Error('Deployment is not in a failed or cancelled state and cannot be retried');
    }

    await deployment.update({ status: 'pending', deployed_at: null, log: '' });
    await this.resetAndStartDeployment(deployment, accessToken);
    return deployment;
  }

  // ── Private: log parsing ────────────────────────────────────────────────────

  private static parseGithubLogs(logs: string): Record<string, string> {
    const stepsLogs: Record<string, string[]> = {};
    let currentStepName: string | null = null;
    const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s?/;

    for (const line of logs.split(/\r?\n/)) {
      const cleanLine = line.replace(TIMESTAMP_RE, '');

      if (cleanLine.includes('##[group]')) {
        const match = cleanLine.match(/##\[group\](.*)/);
        if (match) {
          currentStepName = match[1].trim();
          stepsLogs[currentStepName] = [];
        }
      } else if (cleanLine.includes('##[endgroup]')) {
        currentStepName = null;
      } else if (currentStepName) {
        stepsLogs[currentStepName].push(cleanLine.replace(/##\[[a-z]+\]/, ''));
      }
    }

    const result: Record<string, string> = {};
    for (const [name, lines] of Object.entries(stepsLogs)) {
      result[name] = lines.join('\n');
    }
    return result;
  }

  // ── Private: mock log generation ────────────────────────────────────────────

  private static generateMockLog(
    stepName: string,
    status: StepStatus,
    repoName: string,
  ): string {
    if (status === 'pending') return '';
    if (status === 'skipped') return `${new Date().toISOString()} ##[warning]Step skipped.`;

    const ts   = () => new Date().toISOString();
    const ago  = (ms: number) => new Date(Date.now() - ms).toISOString();
    const name = stepName.toLowerCase();

    if (name.includes('fetch') || name.includes('source') || name.includes('checkout')) {
      if (status === 'running') {
        return [
          `${ts()} Cloning repository...`,
          `${ago(2000)} git init /home/runner/work/${repoName}/${repoName}`,
          `${ago(1000)} git remote add origin https://github.com/...`,
          `${ts()} git fetch --prune --progress --no-tags --depth=1 origin`,
        ].join('\n');
      }
      if (status === 'completed') {
        return [
          `${ago(3000)} Cloning repository...`,
          `${ago(2000)} git fetch --prune --progress --no-tags --depth=1 origin`,
          `${ago(1000)} git checkout --progress --force -B staging refs/remotes/origin/staging`,
          `${ts()} ##[group]Successfully checked out repository.`,
          `${ts()} HEAD is now at 9f23db1 commit message`,
          `${ts()} ##[endgroup]`,
        ].join('\n');
      }
      return `${ts()} ##[error]Git checkout failed. Connection reset by peer.`;
    }

    if (name.includes('build') || name.includes('container') || name.includes('image')) {
      if (status === 'running') {
        return [
          `${ts()} Building docker image for ${repoName}...`,
          `${ts()} $ docker build -f Dockerfile -t local/${repoName}:latest .`,
          `${ts()} Sending build context to Docker daemon  24.5MB`,
          `${ts()} Step 1/6 : FROM node:20-alpine`,
          `${ts()} Step 2/6 : WORKDIR /app`,
        ].join('\n');
      }
      if (status === 'completed') {
        return [
          `${ago(8000)} Building docker image for ${repoName}...`,
          `${ago(5000)} Step 4/6 : RUN npm install`,
          `${ago(3000)} added 245 packages in 4s`,
          `${ago(1000)} Step 6/6 : RUN npm run build`,
          `${ts()} ##[group]Docker build completed successfully.`,
          `${ts()} Successfully built image local/${repoName}:latest`,
          `${ts()} ##[endgroup]`,
        ].join('\n');
      }
      return `${ts()} ##[error]Docker build failed. exit code 1. Error: package.json not found.`;
    }

    if (name.includes('upload') || name.includes('docker hub') || name.includes('push')) {
      if (status === 'running') {
        return [
          `${ts()} Logging in to Docker Hub...`,
          `${ago(1000)} Login Succeeded`,
          `${ts()} Pushing image to Docker Hub...`,
          `${ts()} $ docker push user/${repoName}:latest`,
        ].join('\n');
      }
      if (status === 'completed') {
        return [
          `${ago(4000)} Login Succeeded`,
          `${ago(3000)} Pushing image to Docker Hub...`,
          `${ago(2000)} The push refers to repository [docker.io/user/${repoName}]`,
          `${ts()} ##[group]Push succeeded.`,
          `${ts()} latest: digest: sha256:8f41da8db7b3c2 size: 1542`,
          `${ts()} ##[endgroup]`,
        ].join('\n');
      }
      return `${ts()} ##[error]Docker push failed. Unauthorized: access denied.`;
    }

    if (name.includes('config') || name.includes('env') || name.includes('assets')) {
      if (status === 'running') {
        return [
          `${ts()} Connecting to server via SSH...`,
          `${ts()} Host: xxx.xxx.xxx.xxx`,
        ].join('\n');
      }
      if (status === 'completed') {
        return [
          `${ago(3000)} Connecting to server via SSH...`,
          `${ago(2000)} Preparing application directory...`,
          `${ago(1000)} Writing .env file...`,
          `${ts()} ##[group]Server environment configured.`,
          `${ts()} .env updated successfully.`,
          `${ts()} ##[endgroup]`,
        ].join('\n');
      }
      return `${ts()} ##[error]SSH connection failed: Permission denied (publickey).`;
    }

    if (name.includes('deploy') || name.includes('verify') || name.includes('service')) {
      if (status === 'running') {
        return [
          `${ts()} Connecting to server via SSH...`,
          `${ts()} Pulling latest image...`,
          `${ts()} Stopping old container...`,
        ].join('\n');
      }
      if (status === 'completed') {
        return [
          `${ago(3000)} Stopping old container...`,
          `${ago(2000)} Starting new container...`,
          `${ago(1000)} Checking service health on port...`,
          `${ts()} ##[group]Deployment verified!`,
          `${ts()} ✅ Container running on port 80.`,
          `${ts()} ##[endgroup]`,
        ].join('\n');
      }
      return `${ts()} ##[error]Deployment failed. Container failed to start: Port 80 already in use.`;
    }

    return `${ts()} Executing ${stepName}...`;
  }
}
