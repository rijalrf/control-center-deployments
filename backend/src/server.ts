import app from './app';
import { env } from './config/env';
import { sequelize } from './models';

const PORT = env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    await sequelize.sync({ alter: true });
    console.log('✅ Models synchronized');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 CCD Backend running on port ${PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
