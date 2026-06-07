"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentService = void 0;
const Deployment_1 = require("../models/Deployment");
const DeploymentStep_1 = require("../models/DeploymentStep");
const Environment_1 = require("../models/Environment");
const Server_1 = require("../models/Server");
const github_service_1 = require("./github.service");
// Map GitHub Actions step status → our status
function mapStepStatus(ghStatus, ghConclusion) {
    if (ghStatus === 'queued')
        return 'pending';
    if (ghStatus === 'in_progress')
        return 'running';
    if (ghStatus === 'completed') {
        if (ghConclusion === 'success')
            return 'completed';
        if (ghConclusion === 'skipped')
            return 'skipped';
        return 'failed'; // failure | cancelled | timed_out | action_required
    }
    return 'pending';
}
class DeploymentService {
    static async createDeployment(data) {
        const deployment = await Deployment_1.Deployment.create({
            environment_id: data.environment_id,
            user_id: data.user_id,
            repositories: data.repositories,
            config: data.config || {},
            status: data.status || 'pending',
            notes: data.notes || null,
            deployed_at: null
        });
        const isDraft = data.status === 'draft';
        const now = new Date();
        // Define standard pipeline steps for a complete view immediately
        const standardSteps = [
            { step_number: 1, step_name: 'Initializing Deployment Pipeline', status: (isDraft ? 'pending' : 'running'), log: isDraft ? null : 'Preparing deployment and triggering GitHub Actions workflow...' },
            { step_number: 2, step_name: 'Fetching Source Code from Repository', status: 'pending' },
            { step_number: 3, step_name: 'Building Application Container Image', status: 'pending' },
            { step_number: 4, step_name: 'Uploading Image to Docker Hub Registry', status: 'pending' },
            { step_number: 5, step_name: 'Configuring Server Environment & Assets', status: 'pending' },
            { step_number: 6, step_name: 'Deploying Container & Verifying Service', status: 'pending' },
        ];
        await DeploymentStep_1.DeploymentStep.bulkCreate(standardSteps.map(s => ({
            ...s,
            deployment_id: deployment.id,
            started_at: s.status === 'running' ? now : null,
            detail: s.step_number === 1 ? { environment_id: data.environment_id, repositories: data.repositories } : {},
        })));
        if (!isDraft) {
            this.startGitHubActionsDeployment(deployment.id, data.accessToken, data);
        }
        return deployment;
    }
    static async startGitHubActionsDeployment(deploymentId, accessToken, data) {
        try {
            const envObj = await Environment_1.Environment.findByPk(data.environment_id);
            const envName = envObj?.name || 'staging';
            const server = await Server_1.Server.findOne({ where: { environment_id: data.environment_id } });
            const serverHost = server?.host || 'localhost';
            const serverUsername = server?.username || 'deploy';
            const envSuffix = envName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
            const runsInfo = [];
            // Hardcode ref based on environment
            const workflowRef = envName.toLowerCase() === 'production' ? 'main' : 'staging';
            for (const r of data.repositories) {
                const repoConfig = data.config[r.name] || {};
                const dockerfilePath = repoConfig.DOCKERFILE_PATH || 'Dockerfile';
                const targetInputs = {
                    target_repo_url: r.clone_url || `https://github.com/${r.full_name}.git`,
                    target_repo_name: r.name,
                    target_repo_path: r.full_name || r.name,
                    environment: envName,
                    environment_secret_suffix: envSuffix,
                    config: JSON.stringify(repoConfig),
                    server_host: serverHost,
                    server_username: serverUsername,
                    dockerfile_path: dockerfilePath,
                };
                const runInfo = await github_service_1.GitHubService.dispatchCentralWorkflow(accessToken, targetInputs, workflowRef);
                runsInfo.push({ ...runInfo, repoName: r.name });
            }
            // Mark "Inisialisasi" as completed, workflow dispatched
            await DeploymentStep_1.DeploymentStep.update({ status: 'completed', completed_at: new Date(), log: `Workflow GitHub Actions berhasil dipicu untuk ${runsInfo.length} repositori.` }, { where: { deployment_id: deploymentId, step_number: 1 } });
            this.pollGitHubActionsProgress(deploymentId, accessToken, runsInfo);
        }
        catch (err) {
            console.error('Gagal memulai deployment via GitHub Actions:', err);
            await Deployment_1.Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
            await DeploymentStep_1.DeploymentStep.update({ status: 'failed', completed_at: new Date(), log: `Gagal memicu workflow GitHub Actions: ${err.message}` }, { where: { deployment_id: deploymentId, step_number: 1 } });
        }
    }
    static pollGitHubActionsProgress(deploymentId, accessToken, runsInfo) {
        const intervalTime = 4000;
        const maxRetries = 150; // 10 menit
        let retries = 0;
        let stepsInitialized = false; // apakah sudah sync step dari GitHub Actions
        const runsMap = runsInfo.map(r => ({
            ...r,
            runId: null,
            status: 'queued',
            conclusion: null,
            jobId: null,
            htmlUrl: '',
        }));
        const timer = setInterval(async () => {
            try {
                retries++;
                if (retries > maxRetries) {
                    clearInterval(timer);
                    await Deployment_1.Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
                    await DeploymentStep_1.DeploymentStep.update({ status: 'failed', completed_at: new Date(), log: 'Timeout: pelacakan dibatalkan setelah 10 menit.' }, { where: { deployment_id: deploymentId, status: ['pending', 'running'] } });
                    return;
                }
                // 1. Temukan run ID
                for (const run of runsMap) {
                    if (!run.runId) {
                        const githubRun = await github_service_1.GitHubService.findWorkflowRun(accessToken, run.owner, run.repo, run.workflowId, run.dispatchTime);
                        if (githubRun) {
                            run.runId = githubRun.id;
                            run.status = githubRun.status;
                            run.conclusion = githubRun.conclusion;
                        }
                    }
                }
                const allFound = runsMap.every(r => r.runId !== null);
                if (!allFound)
                    return; // tunggu sampai semua run ditemukan
                // 2. Ambil steps dari GitHub Actions untuk setiap run
                // Untuk simplifikasi, gunakan run pertama sebagai acuan steps
                const firstRun = runsMap[0];
                const jobs = await github_service_1.GitHubService.getWorkflowRunJobs(accessToken, firstRun.owner, firstRun.repo, firstRun.runId);
                if (!jobs || jobs.length === 0)
                    return;
                const job = jobs[0];
                const ghSteps = job.steps || [];
                firstRun.jobId = job.id;
                firstRun.htmlUrl = job.html_url || '';
                // Update overall run status
                const runStatus = await github_service_1.GitHubService.getWorkflowRunStatus(accessToken, firstRun.owner, firstRun.repo, firstRun.runId);
                firstRun.status = runStatus.status;
                firstRun.conclusion = runStatus.conclusion;
                // 3. Sync steps from GitHub Actions to DB
                if (ghSteps.length > 0) {
                    if (!stepsInitialized) {
                        stepsInitialized = true;
                        await Deployment_1.Deployment.update({ status: 'running' }, { where: { id: deploymentId } });
                    }
                    for (const ghStep of ghSteps) {
                        const newStatus = mapStepStatus(ghStep.status, ghStep.conclusion);
                        // Try to find step by name only to avoid adding random Github Actions internal steps
                        const existingStep = await DeploymentStep_1.DeploymentStep.findOne({
                            where: {
                                deployment_id: deploymentId,
                                step_name: ghStep.name
                            }
                        });
                        if (existingStep) {
                            await existingStep.update({
                                status: newStatus,
                                started_at: ghStep.started_at ? new Date(ghStep.started_at) : existingStep.started_at,
                                completed_at: ghStep.completed_at ? new Date(ghStep.completed_at) : existingStep.completed_at,
                                detail: { ...(existingStep.detail || {}), github_step_number: ghStep.number, run_url: firstRun.htmlUrl }
                            });
                        }
                    }
                    // 4. Update logs for each step individually
                    try {
                        const logs = await github_service_1.GitHubService.getJobLogs(accessToken, firstRun.owner, firstRun.repo, firstRun.jobId);
                        if (logs && typeof logs === 'string') {
                            // Save the full raw log on the deployment itself
                            await Deployment_1.Deployment.update({ log: logs }, { where: { id: deploymentId } });
                            const parsedLogs = this.parseGithubLogs(logs);
                            const hasAnyParsedLog = Object.keys(parsedLogs).length > 0;
                            const dbSteps = await DeploymentStep_1.DeploymentStep.findAll({ where: { deployment_id: deploymentId } });
                            for (const dbStep of dbSteps) {
                                // Skip step 1 as it is initialized with local info
                                if (dbStep.step_number === 1)
                                    continue;
                                const stepLog = parsedLogs[dbStep.step_name];
                                if (stepLog) {
                                    await dbStep.update({ log: stepLog });
                                }
                                else if (dbStep.status === 'running') {
                                    await dbStep.update({ log: 'Executing step... logs will appear shortly.' });
                                }
                                else if (dbStep.status === 'failed' && !hasAnyParsedLog) {
                                    // Fallback: if step failed and we have no parsed logs, save raw logs to this failed step
                                    await dbStep.update({ log: `GitHub Actions Run: ${firstRun.htmlUrl}\n\n${logs}` });
                                }
                            }
                        }
                    }
                    catch (logErr) {
                        console.error('Failed to update step logs:', logErr.message);
                    }
                }
                // 5. Cek apakah semua run selesai
                const allCompleted = runsMap.every(r => r.status === 'completed');
                const anyFailed = runsMap.some(r => r.conclusion === 'failure' || r.conclusion === 'cancelled' || r.conclusion === 'timed_out');
                if (allCompleted) {
                    clearInterval(timer);
                    if (anyFailed) {
                        await Deployment_1.Deployment.update({ status: 'failed' }, { where: { id: deploymentId } });
                    }
                    else {
                        await Deployment_1.Deployment.update({ status: 'success', deployed_at: new Date() }, { where: { id: deploymentId } });
                    }
                }
            }
            catch (err) {
                console.error('Error saat polling deployment:', err.message);
            }
        }, intervalTime);
    }
    static async executeDraftDeployment(deploymentId, accessToken) {
        const deployment = await Deployment_1.Deployment.findByPk(deploymentId, {
            include: [{ model: DeploymentStep_1.DeploymentStep, as: 'steps' }]
        });
        if (!deployment)
            throw new Error('Deployment not found');
        if (deployment.status !== 'draft')
            throw new Error('Deployment is not a draft and cannot be executed');
        await deployment.update({ status: 'pending', deployed_at: null });
        // Hapus semua step lama dan buat ulang steps standard
        await DeploymentStep_1.DeploymentStep.destroy({ where: { deployment_id: deploymentId } });
        const standardSteps = [
            { step_number: 1, step_name: 'Initializing Deployment Pipeline', status: 'running', log: 'Preparing deployment and triggering GitHub Actions workflow...' },
            { step_number: 2, step_name: 'Fetching Source Code from Repository', status: 'pending' },
            { step_number: 3, step_name: 'Building Application Container Image', status: 'pending' },
            { step_number: 4, step_name: 'Uploading Image to Docker Hub Registry', status: 'pending' },
            { step_number: 5, step_name: 'Configuring Server Environment & Assets', status: 'pending' },
            { step_number: 6, step_name: 'Deploying Container & Verifying Service', status: 'pending' },
        ];
        await DeploymentStep_1.DeploymentStep.bulkCreate(standardSteps.map(s => ({
            ...s,
            deployment_id: deploymentId,
            started_at: s.status === 'running' ? new Date() : null,
            detail: s.step_number === 1 ? { environment_id: deployment.environment_id, repositories: deployment.repositories } : {},
        })));
        const data = {
            environment_id: deployment.environment_id,
            repositories: deployment.repositories || [],
            config: deployment.config || {},
        };
        this.startGitHubActionsDeployment(deployment.id, accessToken, data);
        return deployment;
    }
    static parseGithubLogs(logs) {
        const stepsLogs = {};
        let currentStepName = null;
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
            }
            else if (cleanLine.includes('##[endgroup]')) {
                currentStepName = null;
            }
            else if (currentStepName) {
                // Remove formatting/logging prefixes like ##[debug], ##[error]
                const logLine = cleanLine.replace(/##\[[a-z]+\]/, '');
                stepsLogs[currentStepName].push(logLine);
            }
        }
        const result = {};
        for (const [name, linesArr] of Object.entries(stepsLogs)) {
            result[name] = linesArr.join('\n');
        }
        return result;
    }
}
exports.DeploymentService = DeploymentService;
