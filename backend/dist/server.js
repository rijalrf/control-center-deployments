"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const models_1 = require("./models");
const PORT = env_1.env.PORT || 5000;
async function start() {
    try {
        await models_1.sequelize.authenticate();
        console.log('✅ Database connected');
        await models_1.sequelize.sync({ alter: true });
        console.log('✅ Models synchronized');
        app_1.default.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 CCD Backend running on port ${PORT} in ${env_1.env.NODE_ENV} mode`);
        });
    }
    catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}
start();
