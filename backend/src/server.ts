import app from './app';
import { env } from './config/env';
import { sequelize, Environment } from './models';
import { Op } from 'sequelize';

const PORT = env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();

    // Safely add column target_branch if it does not exist (bypassing sequelize alter:true duplicate keys bug)
    try {
      const [results] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'environments' 
          AND COLUMN_NAME = 'target_branch'
      `);
      if (Array.isArray(results) && results.length === 0) {
        console.log('Adding target_branch column to environments table...');
        await sequelize.query('ALTER TABLE environments ADD COLUMN target_branch VARCHAR(100) DEFAULT "main"');
        console.log('✅ target_branch column added successfully');
      }
    } catch (err: unknown) {
      console.warn('⚠️ Could not check/add target_branch column:', err instanceof Error ? err.message : String(err));
    }

    await sequelize.sync();
    console.log('✅ Models synchronized');

    // Seed static environments
    const staticEnvs = [
      { id: 1, name: 'non production #1', slug: 'non-production-1', description: 'Environment Non-Production 1', color: '#3b82f6', target_branch: 'dev' },
      { id: 2, name: 'non production #2', slug: 'non-production-2', description: 'Environment Non-Production 2', color: '#06b6d4', target_branch: 'staging' },
      { id: 3, name: 'production', slug: 'production', description: 'Environment Production', color: '#ef4444', target_branch: 'main' }
    ];
    for (const envObj of staticEnvs) {
      await Environment.upsert(envObj);
    }
    // Safely delete any other environments
    await Environment.destroy({
      where: {
        id: {
          [Op.notIn]: [1, 2, 3]
        }
      }
    }).catch((err: unknown) => {
      console.warn('⚠️ Could not delete old environments (possibly due to foreign key constraints):', err instanceof Error ? err.message : String(err));
    });
    console.log('✅ Static environments seeded/verified');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 CCD Backend running on port ${PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
