import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { UserAttributes } from '../types';

export class User extends Model<UserAttributes, Omit<UserAttributes, 'id'>> implements UserAttributes {
  public id!: number;
  public github_id!: string;
  public login!: string;
  public name!: string | null;
  public email!: string | null;
  public avatar_url!: string | null;
  public access_token!: string | null;
  public password!: string | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

User.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  github_id: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  login: { type: DataTypes.STRING(100), allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: true },
  email: { type: DataTypes.STRING(200), allowNull: true },
  avatar_url: { type: DataTypes.TEXT, allowNull: true },
  access_token: { type: DataTypes.TEXT, allowNull: true },
  password: { type: DataTypes.STRING(255), allowNull: true },
}, {
  sequelize,
  tableName: 'users',
  underscored: true,
});
