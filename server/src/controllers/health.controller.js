import { checkDBHealth } from '../config/db.js';
import { env } from '../config/env.js';

export const getHealth = (req, res) => {
  const dbStatus = checkDBHealth();

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  return res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'Smart Queue & Token System API',
      version: '1.0.0',
      academicProject: 'GL Bajaj Institute of Technology & Management, CSE (Data Science)',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      database: dbStatus,
      smsService: env.SMS_ENABLED ? 'active (Twilio)' : 'simulated (SMS_ENABLED=false)'
    }
  });
};
