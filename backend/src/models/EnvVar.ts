import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface EnvVarAttributes {
  id: number;
  name: string;           // Label/nama grup (e.g. "my-app production")
  repository_name: string; // Nama repo (e.g. "my-app")
  environment_id: number | null;
  vars: Record<string, string>; // { KEY: "value", ... }
  created_at: Date;
  updated_at: Date;
}

interface EnvVarCreationAttributes extends Optional<EnvVarAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class EnvVar extends Model<EnvVarAttributes, EnvVarCreationAttributes> implements EnvVarAttributes {
  public id!: number;
  public name!: string;
  public repository_name!: string;
  public environment_id!: number | null;
  public vars!: Record<string, string>;
  public created_at!: Date;
  public updated_at!: Date;
}

EnvVar.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  repository_name: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
  environment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  vars: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize,
  tableName: 'env_vars',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
