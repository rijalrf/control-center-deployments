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

    // Start with 1 placeholder step: "Inisialisasi"
    await DeploymentStep.bulkCreate([
      {
        deployment_id: deployment.id,
        step_number: 1,
        step_name: 'Inisialisasi',
        status: isDraft ? 'pending' : 'running',
        detail: { environment_id: data.environment_id, repositories: data.repositories },
        started_at: isDraft ? null : now,
        completed_at: null,
        log: isDraft ? null : 'Mempersiapkan deployment dan memicu workflow GitHub Actions...',
      }
    ]);

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
        const targetInputs = {
          target_repo_url: r.clone_url || `https://github.com/${r.full_name}.git`,
          target_repo_name: r.name,
          target_repo_path: r.full_name || r.name,
          environment: envName,
          environment_secret_suffix: envSuffix,
          config: JSON.stringify(data.config[r.name] || data.config || {}),
          server_host: serverHost,
          server_username: serverUsername,
        };

        const runInfo = await GitHubService.dispatchCentralWorkflow(accessToken, targetInputs);
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

        // 3. Pertama kali steps tersedia: sync semua steps dari GitHub Actions ke DB
        if (!stepsInitialized && ghSteps.length > 0) {
          stepsInitialized = true;

          // Hapus semua step lama (kecuali step 1 "Inisialisasi" yang sudah completed)
          await DeploymentStep.destroy({ where: { deployment_id: deploymentId, step_number: { [require('sequelize').Op.gt]: 1 } } });

          // Buat steps baru berdasarkan GitHub Actions steps (mulai dari step_number 2)
          const newSteps = ghSteps.map((ghStep: any) => ({
            deployment_id: deploymentId,
            step_number: ghStep.number + 1, // +1 karena step 1 sudah dipakai "Inisialisasi"
            step_name: ghStep.name,
            status: mapStepStatus(ghStep.status, ghStep.conclusion),
            detail: { github_step_number: ghStep.number, run_url: firstRun.htmlUrl },
            started_at: ghStep.started_at ? new Date(ghStep.started_at) : null,
            completed_at: ghStep.completed_at ? new Date(ghStep.completed_at) : null,
            log: null,
          }));

          await DeploymentStep.bulkCreate(newSteps);
          await Deployment.update({ status: 'running' }, { where: { id: deploymentId } });
        }

        // 4. Update status setiap step dari GitHub Actions
        if (stepsInitialized && ghSteps.length > 0) {
          for (const ghStep of ghSteps) {
            const dbStepNum = ghStep.number + 1;
            const newStatus = mapStepStatus(ghStep.status, ghStep.conclusion);

            await DeploymentStep.update(
              {
                status: newStatus,
                started_at: ghStep.started_at ? new Date(ghStep.started_at) : undefined,
                completed_at: ghStep.completed_at ? new Date(ghStep.completed_at) : undefined,
              },
              { where: { deployment_id: deploymentId, step_number: dbStepNum } }
            );
          }

          // Update log on the last step or failed step with job URL
          const failedStep = ghSteps.find((s: any) => s.conclusion === 'failure');
          const logTarget = failedStep ? failedStep.number + 1 : ghSteps[ghSteps.length - 1].number + 1;
          const logs = await GitHubService.getJobLogs(accessToken, firstRun.owner, firstRun.repo, firstRun.jobId!);
          await DeploymentStep.update(
            { log: `GitHub Actions Run: ${firstRun.htmlUrl}\n\n${logs}` },
            { where: { deployment_id: deploymentId, step_number: logTarget } }
          );
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

    // Hapus semua step lama dan buat ulang step "Inisialisasi"
    await DeploymentStep.destroy({ where: { deployment_id: deploymentId } });
    await DeploymentStep.create({
      deployment_id: deploymentId,
      step_number: 1,
      step_name: 'Inisialisasi',
      status: 'running',
      detail: { environment_id: deployment.environment_id, repositories: deployment.repositories },
      started_at: new Date(),
      completed_at: null,
      log: 'Mempersiapkan deployment dan memicu workflow GitHub Actions...',
    } as any);

    const data = {
      environment_id: deployment.environment_id as number,
      repositories: (deployment.repositories as any[]) || [],
      config: deployment.config || {},
    };

    this.startGitHubActionsDeployment(deployment.id, accessToken, data);
    return deployment;
  }
}
