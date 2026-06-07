"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvVar = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class EnvVar extends sequelize_1.Model {
}
exports.EnvVar = EnvVar;
EnvVar.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(200), allowNull: false },
    repository_name: { type: sequelize_1.DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    environment_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    vars: { type: sequelize_1.DataTypes.JSON, allowNull: false, defaultValue: {} },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: database_1.default,
    tableName: 'env_vars',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
