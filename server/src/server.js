import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

const startServer = async () => {
  // Connect to database
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`=======================================================`);
    console.log(`  Smart Queue & Token System - Server v1.0.0`);
    console.log(`  GL Bajaj Institute of Technology & Management`);
    console.log(`  Environment: ${env.NODE_ENV}`);
    console.log(`  Port:        ${env.PORT}`);
    console.log(`  Health Check: http://localhost:${env.PORT}/api/v1/health`);
    console.log(`=======================================================`);
  });

  const handleShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      await disconnectDB();
      console.log('Server process terminated cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
};

startServer();
