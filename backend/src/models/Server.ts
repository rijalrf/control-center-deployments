import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { ServerAttributes } from '../types';

export class Server extends Model<ServerAttributes, Omit<ServerAttributes, 'id'>> implements ServerAttributes {
  public id!: number;
  public name!: string;
  public host!: string;
  public port!: number;
  public username!: string | null;
  public environment_id!: number | null;
  public status!: 'active' | 'inactive' | 'unknown';

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Server.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  host: { type: DataTypes.STRING(255), allowNull: false },
  port: { type: DataTypes.SMALLINT.UNSIGNED, defaultValue: 22 },
  username: { type: DataTypes.STRING(100), allowNull: true },
  environment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'inactive', 'unknown'), defaultValue: 'unknown' },
}, {
  sequelize,
  tableName: 'servers',
  underscored: true,
});
