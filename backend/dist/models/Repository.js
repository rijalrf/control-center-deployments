"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Repository = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Repository extends sequelize_1.Model {
}
exports.Repository = Repository;
Repository.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    github_id: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    name: { type: sequelize_1.DataTypes.STRING(200), allowNull: false },
    full_name: { type: sequelize_1.DataTypes.STRING(300), allowNull: false },
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    url: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    clone_url: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    language: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    default_branch: { type: sequelize_1.DataTypes.STRING(100), defaultValue: 'main' },
    visibility: { type: sequelize_1.DataTypes.STRING(20), defaultValue: 'private' },
    synced_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, {
    sequelize: database_1.default,
    tableName: 'repositories',
    underscored: true,
});
