"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    github_id: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    login: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    name: { type: sequelize_1.DataTypes.STRING(200), allowNull: true },
    email: { type: sequelize_1.DataTypes.STRING(200), allowNull: true },
    avatar_url: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    access_token: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
}, {
    sequelize: database_1.default,
    tableName: 'users',
    underscored: true,
});
