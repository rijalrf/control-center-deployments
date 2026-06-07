"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Server extends sequelize_1.Model {
}
exports.Server = Server;
Server.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    host: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    port: { type: sequelize_1.DataTypes.SMALLINT.UNSIGNED, defaultValue: 22 },
    username: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    environment_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: { type: sequelize_1.DataTypes.ENUM('active', 'inactive', 'unknown'), defaultValue: 'unknown' },
}, {
    sequelize: database_1.default,
    tableName: 'servers',
    underscored: true,
});
