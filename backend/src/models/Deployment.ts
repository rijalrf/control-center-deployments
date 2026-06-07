import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { DeploymentAttributes, DeploymentRepository, DeploymentConfig } from '../types';

export class Deployment
  extends Model<DeploymentAttributes, Omit<DeploymentAttributes, 'id'>>
  implements DeploymentAttributes
{
  public id!: number;
  public environment_id!: number | null;
  public user_id!: number | null;
  public repositories!: DeploymentRepository[];
  public config!: DeploymentConfig;
  public status!: 'draft' | 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  public notes!: string | null;
  public deployed_at!: Date | null;
  public log!: string | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Deployment.init({
  id:             { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  environment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  user_id:        { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  repositories:   { type: DataTypes.JSON, allowNull: true },
  config:         { type: DataTypes.JSON, allowNull: true },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'running', 'success', 'failed', 'cancelled'),
    defaultValue: 'draft',
  },
  notes:       { type: DataTypes.TEXT, allowNull: true },
  deployed_at: { type: DataTypes.DATE, allowNull: true },
  log:         { type: DataTypes.TEXT({ length: 'long' }), allowNull: true },
}, {
  sequelize,
  tableName:  'deployments',
  underscored: true,
});
