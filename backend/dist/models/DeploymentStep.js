"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentStep = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class DeploymentStep extends sequelize_1.Model {
}
exports.DeploymentStep = DeploymentStep;
DeploymentStep.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    deployment_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    step_number: { type: sequelize_1.DataTypes.TINYINT.UNSIGNED, allowNull: false },
    step_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'skipped'),
        defaultValue: 'pending',
    },
    detail: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    log: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    started_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    completed_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, {
    sequelize: database_1.default,
    tableName: 'deployment_steps',
    underscored: true,
    timestamps: false,
});
