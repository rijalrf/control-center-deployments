import { Deployment } from '../models/Deployment';
import { DeploymentStep } from '../models/DeploymentStep';

export class DeploymentService {
  static async createDeployment(data: {
    environment_id: number;
    user_id: number;
    repositories: any[];
    config: any;
    notes?: string;
  }) {
    const deployment = await Deployment.create({
      environment_id: data.environment_id,
      user_id: data.user_id,
      repositories: data.repositories,
      config: data.config || {},
      status: 'pending',
      notes: data.notes || null,
      deployed_at: null
    });

    const stepDefs = [
      { step_number: 1, step_name: 'Setup', status: 'completed' as const, detail: { environment_id: data.environment_id, repositories: data.repositories } },
      { step_number: 2, step_name: 'Configuration', status: 'pending' as const, detail: { config: data.config } },
      { step_number: 3, step_name: 'Review & Execute', status: 'pending' as const, detail: null },
    ];

    const now = new Date();
    await DeploymentStep.bulkCreate(
      stepDefs.map((s, i) => ({
        deployment_id: deployment.id,
        ...s,
        started_at: i === 0 ? now : null,
        completed_at: i === 0 ? now : null,
        log: null
      }))
    );

    // Run async simulation
    this.runSimulation(deployment.id);

    return deployment;
  }

  private static runSimulation(deploymentId: number) {
    // Step 2 starts running after 1s
    setTimeout(async () => {
      try {
        await DeploymentStep.update(
          { status: 'running', started_at: new Date() },
          { where: { deployment_id: deploymentId, step_number: 2 } }
        );
        await Deployment.update({ status: 'running' }, { where: { id: deploymentId } });
      } catch (e) {
        console.error('Simulation error at Step 2 run:', e);
      }
    }, 1000);

    // Step 2 completes and Step 3 starts running after 5s
    setTimeout(async () => {
      try {
        await DeploymentStep.update(
          { status: 'completed', completed_at: new Date() },
          { where: { deployment_id: deploymentId, step_number: 2 } }
        );
        await DeploymentStep.update(
          { status: 'running', started_at: new Date() },
          { where: { deployment_id: deploymentId, step_number: 3 } }
        );
      } catch (e) {
        console.error('Simulation error at Step 2 completion:', e);
      }
    }, 5000);

    // Step 3 completes and Deployment succeeds after 8s
    setTimeout(async () => {
      try {
        await DeploymentStep.update(
          { status: 'completed', completed_at: new Date() },
          { where: { deployment_id: deploymentId, step_number: 3 } }
        );
        await Deployment.update(
          { status: 'success', deployed_at: new Date() },
          { where: { id: deploymentId } }
        );
      } catch (e) {
        console.error('Simulation error at Step 3 completion:', e);
      }
    }, 8000);
  }
}
