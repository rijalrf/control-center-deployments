import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { RepositoryAttributes } from '../types';

export class Repository extends Model<RepositoryAttributes, Omit<RepositoryAttributes, 'id'>> implements RepositoryAttributes {
  public id!: number;
  public github_id!: string;
  public name!: string;
  public full_name!: string;
  public description!: string | null;
  public url!: string | null;
  public clone_url!: string | null;
  public language!: string | null;
  public default_branch!: string;
  public visibility!: string;
  public synced_at!: Date | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Repository.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  github_id: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  full_name: { type: DataTypes.STRING(300), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  url: { type: DataTypes.TEXT, allowNull: true },
  clone_url: { type: DataTypes.TEXT, allowNull: true },
  language: { type: DataTypes.STRING(100), allowNull: true },
  default_branch: { type: DataTypes.STRING(100), defaultValue: 'main' },
  visibility: { type: DataTypes.STRING(20), defaultValue: 'private' },
  synced_at: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  tableName: 'repositories',
  underscored: true,
});
