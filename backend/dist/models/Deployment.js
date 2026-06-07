"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deployment = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Deployment extends sequelize_1.Model {
}
exports.Deployment = Deployment;
Deployment.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    environment_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    user_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    repositories: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    config: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    status: {
        type: sequelize_1.DataTypes.ENUM('draft', 'pending', 'running', 'success', 'failed', 'cancelled'),
        defaultValue: 'draft',
    },
    notes: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    deployed_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    log: { type: sequelize_1.DataTypes.TEXT({ length: 'long' }), allowNull: true },
}, {
    sequelize: database_1.default,
    tableName: 'deployments',
    underscored: true,
});
