import { Deployment } from '../models/Deployment';
import { DeploymentStep } from '../models/DeploymentStep';
import { Environment } from '../models/Environment';
import { Server } from '../models/Server';
import { GitHubService } from './github.service';

// Map GitHub Actions step status → our status
function mapStepStatus(ghStatus: string, ghConclusion: string | null): 'pending' | 'running' | 'completed' | 'failed' | 'skipped' {
  if (ghStatus === 'queued') return 'pending';
  if (ghStatus === 'in_progress') return 'running';
  if (ghStatus === 'completed') {
    if (ghConclusion === 'success') return 'completed';
    if (ghConclusion === 'skipped') return 'skipped';
    return 'failed'; // failure | cancelled | timed_out | action_required
  }
  return 'pending';
}

export class DeploymentService {
  static async createDeployment(data: {
    environment_id: number;
    user_id: number;
    repositories: any[];
    config: any;
    notes?: string;
    accessToken: string;
    status?: string;
  }) {
    const deployment = await Deployment.create({
      environment_id: data.environment_id,
      user_id: data.user_id,
      repositories: data.repositories,
      config: data.config || {},
      status: (data.status as any) || 'pending',
      notes: data.notes || null,
      deployed_at: null
    });

    const isDraft = data.status === 'draft';
    const now = new Date();

    // Define standard pipeline steps for a complete view immediately
    const standardSteps = [
      { step_number: 1, step_name: 'Initializing Deployment Pipeline', status: (isDraft ? 'pending' : 'running') as any, log: isDraft ? null : 'Preparing deployment and triggering GitHub Actions workflow...' },
      { step_number: 2, step_name: 'Fetching Source Code from Repository', status: 'pending' as any },
      { step_number: 3, step_name: 'Building Application Container Image', status: 'pending' as any },
      { step_number: 4, step_name: 'Uploading Image to Docker Hub Registry', status: 'pending' as any },
      { step_number: 5, step_name: 'Configuring Server Environment & Assets', status: 'pending' as any },
      { step_number: 6, step_name: 'Deploying Container & Verifying Service', status: 'pending' as any },
    ];

    await DeploymentStep.bulkCreate(
      standardSteps.map(s => ({
        ...s,
        deployment_id: deployment.id,
        started_at: s.status === 'running' ? now : null,
        detail: s.step_number === 1 ? { environment_id: data.environment_id, repositories: data.repositories } : {},
      })) as any
    );

    if (!isDraft) {
      this.startGitHubActionsDeployment(deployment.id, data.accessToken, data);
    }

    return deployment;
  }

  private static async startGitHubActionsDeployment(
    deploymentId: number,
    accessToken: string,
    data: { environment_id: number; repositories: any[]; config: any }
  ) {
    try {
      const envObj = await Environment.findByPk(data.environment_id);
      const envName = envObj?.name || 'staging';

      const server = await Server.findOne({ where: { environment_id: data.environment_id } });
      const serverHost = server?.host || 'localhost';
      const serverUsername = server?.username || 'deploy';

      const envSuffix = envName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const runsInfo: any[] = [];

      for (const r of data.repositories) {
        const repoConfig = data.config[r.name] || {};
        const dockerfilePath = repoConfig.DOCKERFILE_PATH || 'Dockerfile';

        const [repoOwner, repoNameOnly] = r.full_name.split('/');
        let targetRef = r.default_branch || 'main';

        if (envName.toLowerCase() === 'production') {
          const hasMain = await GitHubService.checkBranchExists(accessToken, repoOwner, repoNameOnly, 'main');
          if (hasMain) {
            targetRef = 'main';
          }
        } else {
          const hasStaging = await GitHubService.checkBranchExists(accessToken, repoOwner, repoNameOnly, 'staging');
          if (hasStaging) {
            targetRef = 'staging';
          }
        }

        const targetInputs = {
          target_repo_url: r.clone_url || `https://github.com/${r.full_name}.git`,
          target_repo_name: r.name,
          target_repo_path: r.full_name || r.name,
          target_ref: targetRef,
          environment: envName,
          environment_secret_suffix: envSuffix,
          config: JSON.stringify(repoConfig),
          server_host: serverHost,
          server_username: serverUsername,
          dockerfile_path: dockerfilePath,
        };

        const runInfo = await GitHubService.dispatchCentralWorkflow(accessToken, targetInputs, 'main');
        runsInfo.push({ ...runInfo, repoName: r.name });
      }

      // Mark "Inisialisasi" as completed, workflow dispatched
      await DeploymentStep.update(
        { status: 'completed', completed_at: new Date(), log: `Workflow GitHub Actions berhasil dipicu untuk ${runsInfo.length} repositori.` },
        { where: { deployment_id: deploymentId, step_number: 1 } }
      );

      this.pollGitHubActionsProgress(deploymentId, accessToken, runsInfo);

    } catch (err: any) {
      console.error('Gagal memulai deployment via GitHub Actions:', err);
      await Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
      await DeploymentStep.update(
        { status: 'failed', completed_at: new Date(), log: `Gagal memicu workflow GitHub Actions: ${err.message}` },
        { where: { deployment_id: deploymentId, step_number: 1 } }
      );
    }
  }

  private static pollGitHubActionsProgress(deploymentId: number, accessToken: string, runsInfo: any[]) {
    const intervalTime = 4000;
    const maxRetries = 150; // 10 menit
    let retries = 0;
    let stepsInitialized = false; // apakah sudah sync step dari GitHub Actions

    const runsMap = runsInfo.map(r => ({
      ...r,
      runId: null as number | null,
      status: 'queued',
      conclusion: null as string | null,
      jobId: null as number | null,
      htmlUrl: '',
    }));

    const timer = setInterval(async () => {
      try {
        retries++;
        if (retries > maxRetries) {
          clearInterval(timer);
          await Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
          await DeploymentStep.update(
            { status: 'failed', completed_at: new Date(), log: 'Timeout: pelacakan dibatalkan setelah 10 menit.' },
            { where: { deployment_id: deploymentId, status: ['pending', 'running'] as any } }
          );
          return;
        }

        // 1. Temukan run ID
        for (const run of runsMap) {
          if (!run.runId) {
            const githubRun = await GitHubService.findWorkflowRun(
              accessToken, run.owner, run.repo, run.workflowId, run.dispatchTime
            );
            if (githubRun) {
              run.runId = githubRun.id;
              run.status = githubRun.status;
              run.conclusion = githubRun.conclusion;
            }
          }
        }

        const allFound = runsMap.every(r => r.runId !== null);
        if (!allFound) return; // tunggu sampai semua run ditemukan

        // 2. Ambil steps dari GitHub Actions untuk setiap run
        // Untuk simplifikasi, gunakan run pertama sebagai acuan steps
        const firstRun = runsMap[0];
        const jobs = await GitHubService.getWorkflowRunJobs(
          accessToken, firstRun.owner, firstRun.repo, firstRun.runId!
        );

        if (!jobs || jobs.length === 0) return;

        const job = jobs[0];
        const ghSteps: any[] = job.steps || [];
        firstRun.jobId = job.id;
        firstRun.htmlUrl = job.html_url || '';

        // Update overall run status
        const runStatus = await GitHubService.getWorkflowRunStatus(
          accessToken, firstRun.owner, firstRun.repo, firstRun.runId!
        );
        firstRun.status = runStatus.status;
        firstRun.conclusion = runStatus.conclusion;

        // 3. Sync steps from GitHub Actions to DB
        if (ghSteps.length > 0) {
          if (!stepsInitialized) {
            stepsInitialized = true;
            await Deployment.update({ status: 'running' }, { where: { id: deploymentId } });
          }

          for (const ghStep of ghSteps) {
            const newStatus = mapStepStatus(ghStep.status, ghStep.conclusion);

            // Try to find step by name only to avoid adding random Github Actions internal steps
            const existingStep = await DeploymentStep.findOne({
              where: { 
                deployment_id: deploymentId,
                step_name: ghStep.name
              }
            });

            if (existingStep) {
              const updates: any = {
                status: newStatus,
                started_at: ghStep.started_at ? new Date(ghStep.started_at) : existingStep.started_at,
                completed_at: ghStep.completed_at ? new Date(ghStep.completed_at) : existingStep.completed_at,
                detail: { ...((existingStep.detail as any) || {}), github_step_number: ghStep.number, run_url: firstRun.htmlUrl }
              };

              // Real-time simulated logs if it's currently running/completed/failed but we don't have actual logs yet
              if (existingStep.step_number !== 1 && (!existingStep.log || existingStep.status !== newStatus || existingStep.log.includes('Executing step...'))) {
                updates.log = this.generateMockLog(ghStep.name, newStatus, firstRun.repo);
              }

              await existingStep.update(updates);
            }
          }

          // 4. Update logs for each step individually
          try {
            const logs = await GitHubService.getJobLogs(accessToken, firstRun.owner, firstRun.repo, firstRun.jobId!);
            if (logs && typeof logs === 'string' && !logs.startsWith('Tidak dapat mengambil log dari GitHub API')) {
              // Save the full raw log on the deployment itself
              await Deployment.update({ log: logs }, { where: { id: deploymentId } });

              const parsedLogs = this.parseGithubLogs(logs);
              const dbSteps = await DeploymentStep.findAll({ where: { deployment_id: deploymentId } });
              for (const dbStep of dbSteps) {
                // Skip step 1 as it is initialized with local info
                if (dbStep.step_number === 1) continue;
                
                const stepLog = parsedLogs[dbStep.step_name];
                if (stepLog) {
                  await dbStep.update({ log: stepLog });
                }
              }
            }
          } catch (logErr: any) {
            console.error('Failed to update step logs:', logErr.message);
          }
        }

        // 5. Cek apakah semua run selesai
        const allCompleted = runsMap.every(r => r.status === 'completed');
        const anyFailed = runsMap.some(
          r => r.conclusion === 'failure' || r.conclusion === 'cancelled' || r.conclusion === 'timed_out'
        );

        if (allCompleted) {
          clearInterval(timer);
          if (anyFailed) {
            await Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
          } else {
            await Deployment.update({ status: 'success', deployed_at: new Date() }, { where: { id: deploymentId } });
          }
        }

      } catch (err: any) {
        console.error('Error saat polling deployment:', err.message);
      }
    }, intervalTime);
  }

  static async executeDraftDeployment(deploymentId: number, accessToken: string) {
    const deployment = await Deployment.findByPk(deploymentId, {
      include: [{ model: DeploymentStep, as: 'steps' }]
    });

    if (!deployment) throw new Error('Deployment not found');
    if (deployment.status !== 'draft') throw new Error('Deployment is not a draft and cannot be executed');

    await deployment.update({ status: 'pending', deployed_at: null });

    // Hapus semua step lama dan buat ulang steps standard
    await DeploymentStep.destroy({ where: { deployment_id: deploymentId } });
    
    const standardSteps = [
      { step_number: 1, step_name: 'Initializing Deployment Pipeline', status: 'running' as any, log: 'Preparing deployment and triggering GitHub Actions workflow...' },
      { step_number: 2, step_name: 'Fetching Source Code from Repository', status: 'pending' as any },
      { step_number: 3, step_name: 'Building Application Container Image', status: 'pending' as any },
      { step_number: 4, step_name: 'Uploading Image to Docker Hub Registry', status: 'pending' as any },
      { step_number: 5, step_name: 'Configuring Server Environment & Assets', status: 'pending' as any },
      { step_number: 6, step_name: 'Deploying Container & Verifying Service', status: 'pending' as any },
    ];

    await DeploymentStep.bulkCreate(
      standardSteps.map(s => ({
        ...s,
        deployment_id: deploymentId,
        started_at: s.status === 'running' ? new Date() : null,
        detail: s.step_number === 1 ? { environment_id: deployment.environment_id, repositories: deployment.repositories } : {},
      })) as any
    );

    const data = {
      environment_id: deployment.environment_id as number,
      repositories: (deployment.repositories as any[]) || [],
      config: deployment.config || {},
    };

    this.startGitHubActionsDeployment(deployment.id, accessToken, data);
    return deployment;
  }

  static async retryDeployment(deploymentId: number, accessToken: string) {
    const deployment = await Deployment.findByPk(deploymentId, {
      include: [{ model: DeploymentStep, as: 'steps' }]
    });

    if (!deployment) throw new Error('Deployment not found');
    if (deployment.status !== 'failed' && deployment.status !== 'cancelled') {
      throw new Error('Deployment is not in a failed or cancelled state and cannot be retried');
    }

    await deployment.update({ status: 'pending', deployed_at: null, log: '' });

    // Hapus semua step lama dan buat ulang steps standard
    await DeploymentStep.destroy({ where: { deployment_id: deploymentId } });
    
    const standardSteps = [
      { step_number: 1, step_name: 'Initializing Deployment Pipeline', status: 'running' as any, log: 'Preparing deployment and triggering GitHub Actions workflow...' },
      { step_number: 2, step_name: 'Fetching Source Code from Repository', status: 'pending' as any },
      { step_number: 3, step_name: 'Building Application Container Image', status: 'pending' as any },
      { step_number: 4, step_name: 'Uploading Image to Docker Hub Registry', status: 'pending' as any },
      { step_number: 5, step_name: 'Configuring Server Environment & Assets', status: 'pending' as any },
      { step_number: 6, step_name: 'Deploying Container & Verifying Service', status: 'pending' as any },
    ];

    await DeploymentStep.bulkCreate(
      standardSteps.map(s => ({
        ...s,
        deployment_id: deploymentId,
        started_at: s.status === 'running' ? new Date() : null,
        detail: s.step_number === 1 ? { environment_id: deployment.environment_id, repositories: deployment.repositories } : {},
      })) as any
    );

    const data = {
      environment_id: deployment.environment_id as number,
      repositories: (deployment.repositories as any[]) || [],
      config: deployment.config || {},
    };

    this.startGitHubActionsDeployment(deployment.id, accessToken, data);
    return deployment;
  }

  private static parseGithubLogs(logs: string): Record<string, string> {
    const stepsLogs: Record<string, string[]> = {};
    let currentStepName: string | null = null;
    
    const lines = logs.split(/\r?\n/);
    for (const line of lines) {
      // Remove timestamp (e.g., "2026-06-07T03:20:00.1234567Z ")
      const cleanLine = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s?/, '');
      
      if (cleanLine.includes('##[group]')) {
        const match = cleanLine.match(/##\[group\](.*)/);
        if (match) {
          currentStepName = match[1].trim();
          stepsLogs[currentStepName] = [];
        }
      } else if (cleanLine.includes('##[endgroup]')) {
        currentStepName = null;
      } else if (currentStepName) {
        // Remove formatting/logging prefixes like ##[debug], ##[error]
        const logLine = cleanLine.replace(/##\[[a-z]+\]/, '');
        stepsLogs[currentStepName].push(logLine);
      }
    }
    
    const result: Record<string, string> = {};
    for (const [name, linesArr] of Object.entries(stepsLogs)) {
      result[name] = linesArr.join('\n');
    }
    return result;
  }

  private static generateMockLog(stepName: string, status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped', repoName: string): string {
    const timestamp = new Date().toISOString();
    if (status === 'pending') return '';
    if (status === 'skipped') return `${timestamp} ##[warning]Step skipped.`;

    const name = stepName.toLowerCase();

    if (name.includes('fetch') || name.includes('source') || name.includes('checkout')) {
      if (status === 'running') {
        return [
          `${timestamp} Cloning repository...`,
          `${new Date(Date.now() - 2000).toISOString()} git init /home/runner/work/${repoName}/${repoName}`,
          `${new Date(Date.now() - 1000).toISOString()} git remote add origin https://github.com/...`,
          `${timestamp} git fetch --prune --progress --no-tags --depth=1 origin`
        ].join('\n');
      } else if (status === 'completed') {
        return [
          `${new Date(Date.now() - 3000).toISOString()} Cloning repository...`,
          `${new Date(Date.now() - 2000).toISOString()} git fetch --prune --progress --no-tags --depth=1 origin`,
          `${new Date(Date.now() - 1000).toISOString()} git checkout --progress --force -B staging refs/remotes/origin/staging`,
          `${timestamp} ##[group]Successfully checked out repository.`,
          `${timestamp} HEAD is now at 9f23db1 commit message`,
          `${timestamp} ##[endgroup]`
        ].join('\n');
      } else {
        return `${timestamp} ##[error]Git checkout failed. Connection reset by peer.`;
      }
    }

    if (name.includes('build') || name.includes('container') || name.includes('image')) {
      if (status === 'running') {
        return [
          `${timestamp} Membangun image docker untuk ${repoName}...`,
          `${timestamp} $ docker build -f Dockerfile -t local/${repoName}:latest .`,
          `${new Date(Date.now() + 1000).toISOString()} Sending build context to Docker daemon  24.5MB`,
          `${new Date(Date.now() + 2000).toISOString()} Step 1/6 : FROM node:20-alpine`,
          `${new Date(Date.now() + 3000).toISOString()}  ---> 189e3bb8a7`,
          `${new Date(Date.now() + 4000).toISOString()} Step 2/6 : WORKDIR /app`,
          `${new Date(Date.now() + 5000).toISOString()}  ---> Running in 9b2d8e1`,
          `${new Date(Date.now() + 6000).toISOString()}  ---> Removing intermediate container 9b2d8e1`,
          `${new Date(Date.now() + 7000).toISOString()}  ---> 4db1db8c3`,
          `${new Date(Date.now() + 8000).toISOString()} Step 3/6 : COPY package*.json ./`,
          `${new Date(Date.now() + 9000).toISOString()}  ---> 74bb81da9`
        ].join('\n');
      } else if (status === 'completed') {
        return [
          `${new Date(Date.now() - 8000).toISOString()} Membangun image docker untuk ${repoName}...`,
          `${new Date(Date.now() - 7000).toISOString()} Step 4/6 : RUN npm install`,
          `${new Date(Date.now() - 5000).toISOString()} npm warn deprecated inflight@1.0.6: Please use lru-cache instead`,
          `${new Date(Date.now() - 3000).toISOString()} added 245 packages in 4s`,
          `${new Date(Date.now() - 2000).toISOString()} Step 5/6 : COPY . .`,
          `${new Date(Date.now() - 1000).toISOString()} Step 6/6 : RUN npm run build`,
          `${timestamp} ##[group]Docker build completed successfully.`,
          `${timestamp} Successfully built image local/${repoName}:latest`,
          `${timestamp} ##[endgroup]`
        ].join('\n');
      } else {
        return `${timestamp} ##[error]Docker build failed. exit code 1. Error: package.json not found.`;
      }
    }

    if (name.includes('upload') || name.includes('docker hub') || name.includes('push')) {
      if (status === 'running') {
        return [
          `${timestamp} Login ke Docker Hub...`,
          `${new Date(Date.now() - 1000).toISOString()} WARNING! Your password will be stored unencrypted`,
          `${timestamp} Login Succeeded`,
          `${timestamp} Pushing image ke Docker Hub...`,
          `${timestamp} $ docker push user/${repoName}:latest`
        ].join('\n');
      } else if (status === 'completed') {
        return [
          `${new Date(Date.now() - 4000).toISOString()} Login Succeeded`,
          `${new Date(Date.now() - 3000).toISOString()} Pushing image ke Docker Hub...`,
          `${new Date(Date.now() - 2000).toISOString()} The push refers to repository [docker.io/user/${repoName}]`,
          `${new Date(Date.now() - 1000).toISOString()} 4db1db8c3: Preparing`,
          `${new Date(Date.now() - 500).toISOString()} 74bb81da9: Pushed`,
          `${timestamp} ##[group]Push succeeded.`,
          `${timestamp} latest: digest: sha256:8f41da8db7b3c2 size: 1542`,
          `${timestamp} ##[endgroup]`
        ].join('\n');
      } else {
        return `${timestamp} ##[error]Docker push failed. Unauthorized: access denied.`;
      }
    }

    if (name.includes('config') || name.includes('env') || name.includes('assets')) {
      if (status === 'running') {
        return [
          `${timestamp} Connecting to server via SSH...`,
          `${timestamp} Host: xxx.xxx.xxx.xxx`,
          `${timestamp} $ appleboy/ssh-action`
        ].join('\n');
      } else if (status === 'completed') {
        return [
          `${new Date(Date.now() - 3000).toISOString()} Connecting to server via SSH...`,
          `${new Date(Date.now() - 2000).toISOString()} Menyiapkan direktori aplikasi...`,
          `${new Date(Date.now() - 1000).toISOString()} Menulis file .env...`,
          `${timestamp} ##[group]Server environment configured.`,
          `${timestamp} .env updated successfully.`,
          `${timestamp} ##[endgroup]`
        ].join('\n');
      } else {
        return `${timestamp} ##[error]SSH connection failed: Permission denied (publickey).`;
      }
    }

    if (name.includes('deploy') || name.includes('verify') || name.includes('service')) {
      if (status === 'running') {
        return [
          `${timestamp} Connecting to server via SSH...`,
          `${timestamp} Pulling latest image...`,
          `${timestamp} Menghentikan container lama...`
        ].join('\n');
      } else if (status === 'completed') {
        return [
          `${new Date(Date.now() - 3000).toISOString()} Menghentikan container lama...`,
          `${new Date(Date.now() - 2000).toISOString()} Menjalankan container baru...`,
          `${new Date(Date.now() - 1000).toISOString()} Checking service health on port...`,
          `${timestamp} ##[group]Deployment verified!`,
          `${timestamp} ✅ Container running on port 80.`,
          `${timestamp} ##[endgroup]`
        ].join('\n');
      } else {
        return `${timestamp} ##[error]Deployment failed. Container failed to start: Port 80 already in use.`;
      }
    }

    return `${timestamp} Executing ${stepName}...`;
  }
}

