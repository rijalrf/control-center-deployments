import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { DeploymentStepAttributes, StepDetail } from '../types';

export class DeploymentStep
  extends Model<DeploymentStepAttributes, Omit<DeploymentStepAttributes, 'id'>>
  implements DeploymentStepAttributes
{
  public id!: number;
  public deployment_id!: number;
  public step_number!: number;
  public step_name!: string;
  public status!: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  public detail!: StepDetail;
  public log!: string | null;
  public started_at!: Date | null;
  public completed_at!: Date | null;
}

DeploymentStep.init({
  id:            { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  deployment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  step_number:   { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  step_name:     { type: DataTypes.STRING(100), allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'skipped'),
    defaultValue: 'pending',
  },
  detail:       { type: DataTypes.JSON, allowNull: true },
  log:          { type: DataTypes.TEXT, allowNull: true },
  started_at:   { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  tableName:   'deployment_steps',
  underscored: true,
  timestamps:  false,
});
