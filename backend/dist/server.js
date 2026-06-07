"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const models_1 = require("./models");
const crypto_1 = __importDefault(require("crypto"));
const PORT = env_1.env.PORT || 5000;
async function start() {
    try {
        await models_1.sequelize.authenticate();
        // Safely add column target_branch if it does not exist (bypassing sequelize alter:true duplicate keys bug)
        try {
            const [results] = await models_1.sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'environments' 
          AND COLUMN_NAME = 'target_branch'
      `);
            if (Array.isArray(results) && results.length === 0) {
                console.log('Adding target_branch column to environments table...');
                await models_1.sequelize.query('ALTER TABLE environments ADD COLUMN target_branch VARCHAR(100) DEFAULT "main"');
                console.log('✅ target_branch column added successfully');
            }
        }
        catch (err) {
            console.warn('⚠️ Could not check/add target_branch column:', err instanceof Error ? err.message : String(err));
        }
        // Safely add column password to users if it does not exist
        try {
            const [results] = await models_1.sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'users' 
          AND COLUMN_NAME = 'password'
      `);
            if (Array.isArray(results) && results.length === 0) {
                console.log('Adding password column to users table...');
                await models_1.sequelize.query('ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL');
                console.log('✅ password column added successfully');
            }
        }
        catch (err) {
            console.warn('⚠️ Could not check/add password column:', err instanceof Error ? err.message : String(err));
        }
        await models_1.sequelize.sync();
        console.log('✅ Models synchronized');
        // Seed default users if they don't exist
        try {
            const defaultPasswordHash = crypto_1.default.createHash('sha256').update('admin').digest('hex');
            // Ensure admin exists
            const [adminUser, adminCreated] = await models_1.User.findOrCreate({
                where: { login: 'admin' },
                defaults: {
                    github_id: 'admin_local',
                    login: 'admin',
                    name: 'Administrator',
                    email: 'admin@local.com',
                    password: defaultPasswordHash,
                    avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4'
                }
            });
            if (adminCreated) {
                console.log('✅ Default user admin seeded (pass: admin)');
            }
            else if (!adminUser.password) {
                await adminUser.update({ password: defaultPasswordHash });
                console.log('✅ Default user admin updated with password');
            }
            // Ensure rijal exists
            const [rijalUser, rijalCreated] = await models_1.User.findOrCreate({
                where: { login: 'rijal' },
                defaults: {
                    github_id: 'rijal_local',
                    login: 'rijal',
                    name: 'Rijal',
                    email: 'rijal@local.com',
                    password: defaultPasswordHash,
                    avatar_url: 'https://avatars.githubusercontent.com/u/10660468?v=4'
                }
            });
            if (rijalCreated) {
                console.log('✅ Default user rijal seeded (pass: admin)');
            }
            else if (!rijalUser.password) {
                await rijalUser.update({ password: defaultPasswordHash });
                console.log('✅ Default user rijal updated with password');
            }
        }
        catch (err) {
            console.error('⚠️ Failed to seed default users:', err instanceof Error ? err.message : String(err));
        }
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
