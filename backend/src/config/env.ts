import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config(); // Fallback to local files if any

export const env = {
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
    repo: process.env.GITHUB_CENTRAL_REPO || 'center-control-deployments',
    workflow: process.env.GITHUB_CENTRAL_WORKFLOW || 'central-deploy.yml',
  }
};

// Validate critical variables (warn in dev, throw in prod)
if (!env.github.clientId || !env.github.clientSecret) {
  const message = 'CRITICAL WARNING: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not set. GitHub login will not work.';
  if (env.NODE_ENV === 'production') {
    throw new Error(message);
  } else {
    console.warn(message);
  }
}
