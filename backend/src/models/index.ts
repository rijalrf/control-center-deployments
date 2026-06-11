import sequelize from '../config/database';
import { User } from './User';
import { Environment } from './Environment';
import { Server } from './Server';
import { Repository } from './Repository';
import { Deployment } from './Deployment';
import { DeploymentStep } from './DeploymentStep';
import { EnvVar } from './EnvVar';

// ── Associations ────────────────────────────────────────────
User.hasMany(Repository, { foreignKey: 'user_id', as: 'repositories' });
Repository.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Environment, { foreignKey: 'user_id', as: 'environments' });
Environment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Server, { foreignKey: 'user_id', as: 'servers' });
Server.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Environment.hasMany(Server, { foreignKey: 'environment_id', as: 'servers' });
Server.belongsTo(Environment, { foreignKey: 'environment_id', as: 'environment' });

Environment.hasMany(Deployment, { foreignKey: 'environment_id', as: 'deployments' });
Deployment.belongsTo(Environment, { foreignKey: 'environment_id', as: 'environment' });

User.hasMany(Deployment, { foreignKey: 'user_id', as: 'deployments' });
Deployment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Deployment.hasMany(DeploymentStep, { foreignKey: 'deployment_id', as: 'steps' });
DeploymentStep.belongsTo(Deployment, { foreignKey: 'deployment_id', as: 'deployment' });

Environment.hasMany(EnvVar, { foreignKey: 'environment_id', as: 'envVars' });
EnvVar.belongsTo(Environment, { foreignKey: 'environment_id', as: 'environment' });

export {
  sequelize,
  User,
  Environment,
  Server,
  Repository,
  Deployment,
  DeploymentStep,
  EnvVar,
};
