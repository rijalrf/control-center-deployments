import sequelize from '../config/database';
import { User } from './User';
import { Environment } from './Environment';
import { Server } from './Server';
import { Repository } from './Repository';
import { Deployment } from './Deployment';
import { DeploymentStep } from './DeploymentStep';

// ── Associations ────────────────────────────────────────────
Environment.hasMany(Server, { foreignKey: 'environment_id', as: 'servers' });
Server.belongsTo(Environment, { foreignKey: 'environment_id', as: 'environment' });

Environment.hasMany(Deployment, { foreignKey: 'environment_id', as: 'deployments' });
Deployment.belongsTo(Environment, { foreignKey: 'environment_id', as: 'environment' });

User.hasMany(Deployment, { foreignKey: 'user_id', as: 'deployments' });
Deployment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Deployment.hasMany(DeploymentStep, { foreignKey: 'deployment_id', as: 'steps' });
DeploymentStep.belongsTo(Deployment, { foreignKey: 'deployment_id', as: 'deployment' });

export {
  sequelize,
  User,
  Environment,
  Server,
  Repository,
  Deployment,
  DeploymentStep,
};
