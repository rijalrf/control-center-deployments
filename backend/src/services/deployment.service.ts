import { Deployment } from '../models/Deployment';
import { DeploymentStep } from '../models/DeploymentStep';
import { Environment } from '../models/Environment';
import { Server } from '../models/Server';
import { GitHubService } from './github.service';

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
      status: data.status || 'pending',
      notes: data.notes || null,
      deployed_at: null
    });

    const stepDefs = [
      { step_number: 1, step_name: 'Setup', status: (data.status === 'draft' ? 'pending' : 'running') as any, detail: { environment_id: data.environment_id, repositories: data.repositories } },
      { step_number: 2, step_name: 'Configuration & Build', status: 'pending' as const, detail: { config: data.config } },
      { step_number: 3, step_name: 'Review & Execute', status: 'pending' as const, detail: null },
    ];

    const now = new Date();
    await DeploymentStep.bulkCreate(
      stepDefs.map((s, i) => ({
        deployment_id: deployment.id,
        ...s,
        started_at: (i === 0 && data.status !== 'draft') ? now : null,
        completed_at: null,
        log: (i === 0 && data.status !== 'draft') ? 'Menginisialisasi deployment dan memicu workflow GitHub Actions terpusat...' : null
      }))
    );

    // Only run real async triggers if status is NOT draft
    if (data.status !== 'draft') {
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
      // Fetch target environment details
      const envObj = await Environment.findByPk(data.environment_id);
      const envName = envObj?.name || 'staging';

      // Fetch target server details
      const server = await Server.findOne({ where: { environment_id: data.environment_id } });
      const serverHost = server?.host || 'localhost';
      const serverUsername = server?.username || 'deploy';

      const envSuffix = envName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

      const runsInfo: any[] = [];

      // Trigger workflow dispatch for each selected repository
      for (const r of data.repositories) {
        const targetInputs = {
          target_repo_url: r.clone_url || `https://github.com/${r.full_name}.git`,
          target_repo_name: r.name,
          environment: envName,
          environment_secret_suffix: envSuffix,
          config: JSON.stringify(data.config[r.name] || data.config || {}),
          server_host: serverHost,
          server_username: serverUsername,
        };

        const runInfo = await GitHubService.dispatchCentralWorkflow(accessToken, targetInputs);
        runsInfo.push({ ...runInfo, repoName: r.name });
      }

      // Start the background progress tracking poller
      this.pollGitHubActionsProgress(deploymentId, accessToken, runsInfo);

    } catch (err: any) {
      console.error('Gagal memulai deployment via GitHub Actions:', err);
      // Update deployment status to failed
      await Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
      await DeploymentStep.update(
        { status: 'failed', log: `Gagal memicu workflow GitHub Actions: ${err.message}` },
        { where: { deployment_id: deploymentId, step_number: 1 } }
      );
    }
  }

  private static pollGitHubActionsProgress(deploymentId: number, accessToken: string, runsInfo: any[]) {
    const intervalTime = 4000; // Poll setiap 4 detik
    const maxRetries = 150; // Timeout setelah 10 menit (150 * 4 detik)
    let retries = 0;

    const runsMap = runsInfo.map(r => ({
      ...r,
      runId: null as number | null,
      status: 'queued',
      conclusion: null as string | null,
      logs: '',
    }));

    const timer = setInterval(async () => {
      try {
        retries++;
        if (retries > maxRetries) {
          clearInterval(timer);
          await Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
          await DeploymentStep.update(
            { status: 'failed', log: 'Pelacakan dibatalkan karena waktu tunggu melebihi batas (Timeout 10 Menit).' },
            { where: { deployment_id: deploymentId, status: ['pending', 'running'] as any } }
          );
          return;
        }

        // 1. Temukan run ID untuk workflow dispatch yang dipicu
        for (const run of runsMap) {
          if (!run.runId) {
            const githubRun = await GitHubService.findWorkflowRun(
              accessToken,
              run.owner,
              run.repo,
              run.workflowId,
              run.dispatchTime
            );
            if (githubRun) {
              run.runId = githubRun.id;
              run.status = githubRun.status;
              run.conclusion = githubRun.conclusion;
            }
          }
        }

        const allFound = runsMap.every(r => r.runId !== null);

        // 2. Perbarui status run ID yang diketahui dan ambil log
        for (const run of runsMap) {
          if (run.runId) {
            const runStatus = await GitHubService.getWorkflowRunStatus(
              accessToken,
              run.owner,
              run.repo,
              run.runId
            );
            run.status = runStatus.status;
            run.conclusion = runStatus.conclusion;

            const jobs = await GitHubService.getWorkflowRunJobs(
              accessToken,
              run.owner,
              run.repo,
              run.runId
            );
            if (jobs && jobs.length > 0) {
              const jobId = jobs[0].id;
              const logs = await GitHubService.getJobLogs(accessToken, run.owner, run.repo, jobId);
              run.logs = `[Repositori: ${run.repoName}]\nLink Run: ${runStatus.html_url}\nLog Output:\n${logs}`;
            } else {
              run.logs = `[Repositori: ${run.repoName}]\nLink Run: ${runStatus.html_url}\nStatus: ${run.status}\nMenunggu pekerjaan dimulai...`;
            }
          }
        }

        // Gabungkan log dari seluruh workflow
        const combinedLogs = runsMap
          .map(r => r.logs || `Menunggu antrean workflow run untuk ${r.repoName} di GitHub...`)
          .join('\n\n' + '='.repeat(50) + '\n\n');

        // 3. Evaluasi status
        const allRunningOrCompleted = runsMap.every(r => r.status === 'in_progress' || r.status === 'completed');
        const allCompleted = runsMap.every(r => r.status === 'completed');
        const anyFailed = runsMap.some(
          r => r.conclusion === 'failure' || r.conclusion === 'cancelled' || r.conclusion === 'timed_out'
        );

        if (anyFailed) {
          clearInterval(timer);
          await Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
          
          // Gagalkan langkah-langkah yang masih aktif
          await DeploymentStep.update(
            { status: 'failed', completed_at: new Date(), log: combinedLogs },
            { where: { deployment_id: deploymentId, status: ['pending', 'running'] as any } }
          );
          return;
        }

        // Perbarui Step 1 (Setup)
        const step1 = await DeploymentStep.findOne({ where: { deployment_id: deploymentId, step_number: 1 } });
        if (step1 && step1.status !== 'completed') {
          if (allFound) {
            await step1.update({
              status: 'completed',
              completed_at: new Date(),
              log: 'Semua workflow GitHub Actions berhasil dipicu dan terdeteksi.\n\n' + combinedLogs,
            });
          } else {
            await step1.update({
              log: `Memicu workflow terpusat di GitHub...\n\n` + combinedLogs,
            });
          }
        }

        // Perbarui Step 2 (Configuration & Build)
        const step2 = await DeploymentStep.findOne({ where: { deployment_id: deploymentId, step_number: 2 } });
        if (step2) {
          if (step2.status === 'pending' && allRunningOrCompleted) {
            await step2.update({ status: 'running', started_at: new Date(), log: combinedLogs });
            await Deployment.update({ status: 'running' }, { where: { id: deploymentId } });
          } else if (step2.status === 'running') {
            await step2.update({ log: combinedLogs });
            if (allCompleted) {
              await step2.update({ status: 'completed', completed_at: new Date() });
            }
          }
        }

        // Perbarui Step 3 (Review & Execute)
        const step3 = await DeploymentStep.findOne({ where: { deployment_id: deploymentId, step_number: 3 } });
        if (step3 && step3.status === 'pending' && allCompleted) {
          await step3.update({
            status: 'completed',
            started_at: new Date(),
            completed_at: new Date(),
            log: 'Deployment selesai dengan sukses via GitHub Actions!',
          });
          await Deployment.update({ status: 'success', deployed_at: new Date() }, { where: { id: deploymentId } });
          clearInterval(timer);
        }

      } catch (err: any) {
        console.error('Error saat melakukan polling status deployment:', err);
      }
    }, intervalTime);
  }

  static async executeDraftDeployment(deploymentId: number, accessToken: string) {
    const deployment = await Deployment.findByPk(deploymentId, {
      include: [{ model: DeploymentStep, as: 'steps' }]
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    if (deployment.status !== 'draft') {
      throw new Error('Deployment is not a draft and cannot be executed');
    }

    // Update status to pending
    await deployment.update({ status: 'pending', deployed_at: null });

    // Reset step 1 to running
    const step1 = await DeploymentStep.findOne({ where: { deployment_id: deploymentId, step_number: 1 } });
    if (step1) {
      await step1.update({
        status: 'running',
        started_at: new Date(),
        completed_at: null,
        log: 'Menginisialisasi deployment dan memicu workflow GitHub Actions terpusat...'
      });
    }

    // Reset steps 2 and 3 to pending
    await DeploymentStep.update(
      { status: 'pending', started_at: null, completed_at: null, log: null },
      { where: { deployment_id: deploymentId, step_number: [2, 3] } }
    );

    const data = {
      environment_id: deployment.environment_id,
      repositories: deployment.repositories || [],
      config: deployment.config || {},
    };

    // Run async trigger
    this.startGitHubActionsDeployment(deployment.id, accessToken, data);

    return deployment;
  }
}
