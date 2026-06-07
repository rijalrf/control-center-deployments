import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { EnvironmentAttributes } from '../types';

export class Environment extends Model<EnvironmentAttributes, Omit<EnvironmentAttributes, 'id'>> implements EnvironmentAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description!: string | null;
  public color!: string;
  public target_branch!: string | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Environment.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  color: { type: DataTypes.STRING(20), defaultValue: '#06b6d4' },
  target_branch: { type: DataTypes.STRING(100), allowNull: true, defaultValue: 'main' },
}, {
  sequelize,
  tableName: 'environments',
  underscored: true,
});
