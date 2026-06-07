"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Environment extends sequelize_1.Model {
}
exports.Environment = Environment;
Environment.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    slug: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    color: { type: sequelize_1.DataTypes.STRING(20), defaultValue: '#06b6d4' },
    target_branch: { type: sequelize_1.DataTypes.STRING(100), allowNull: true, defaultValue: 'main' },
}, {
    sequelize: database_1.default,
    tableName: 'environments',
    underscored: true,
});
