"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../../.env') });
dotenv_1.default.config(); // Fallback to local files if any
exports.env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.BACKEND_PORT || '5000', 10),
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    JWT_SECRET: process.env.JWT_SECRET || 'supersecret',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    // Database Configuration
    db: {
        host: process.env.DB_HOST || 'ccd-mysql',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        name: process.env.DB_NAME || 'ccd_db',
        user: process.env.DB_USER || 'ccd_user',
        password: process.env.DB_PASSWORD || 'ccd_password',
    },
    // GitHub OAuth Configuration
    github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback',
        token: process.env.GITHUB_TOKEN || '',
        org: process.env.GITHUB_ORG || '',
    },
    central: {
        owner: process.env.GITHUB_CENTRAL_OWNER || '',
        repo: process.env.GITHUB_CENTRAL_REPO || 'control-center-deployments',
        workflow: process.env.GITHUB_CENTRAL_WORKFLOW || 'central-deploy.yml',
        ref: process.env.GITHUB_CENTRAL_REF || 'main',
    }
};
// Validate critical variables (warn in dev, throw in prod)
if (!exports.env.github.clientId || !exports.env.github.clientSecret) {
    const message = 'CRITICAL WARNING: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not set. GitHub login will not work.';
    if (exports.env.NODE_ENV === 'production') {
        throw new Error(message);
    }
    else {
        console.warn(message);
    }
}
