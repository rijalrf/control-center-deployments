"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const env_1 = require("./env");
const sequelize = new sequelize_1.Sequelize(env_1.env.db.name, env_1.env.db.user, env_1.env.db.password, {
    host: env_1.env.db.host,
    port: env_1.env.db.port,
    dialect: 'mysql',
    logging: env_1.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
    define: {
        timestamps: true,
        underscored: true,
    },
});
exports.default = sequelize;
