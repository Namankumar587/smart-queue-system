import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory, falling back to root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sanitizeMongoUri = (uri) => {
  if (!uri) return 'mongodb://127.0.0.1:27017/smart_queue_glb';
  let cleaned = uri.trim().replace(/^["']|["']$/g, '').trim();
  // Auto-heal if protocol was omitted but host is Atlas
  if (cleaned.includes('.mongodb.net') && !cleaned.startsWith('mongodb://') && !cleaned.startsWith('mongodb+srv://')) {
    cleaned = `mongodb+srv://${cleaned}`;
  }
  // Ensure Atlas connects against the admin auth database
  if (cleaned.includes('.mongodb.net') && !cleaned.includes('authSource=')) {
    cleaned += (cleaned.includes('?') ? '&' : '?') + 'authSource=admin';
  }
  return cleaned;
};

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CORS_ORIGIN: process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: sanitizeMongoUri(process.env.MONGODB_URI),
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_academic_demo_do_not_use_in_prod_32chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  SMS_ENABLED: process.env.SMS_ENABLED === 'true',
  SMS_PROVIDER: process.env.SMS_PROVIDER || (process.env.SMS_ENABLED === 'true' ? 'TWILIO' : 'SIMULATION'),
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  TWILIO_STATUS_CALLBACK_URL: process.env.TWILIO_STATUS_CALLBACK_URL || '',
  FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY || '',
  FAST2SMS_SENDER_ID: process.env.FAST2SMS_SENDER_ID || 'GLBHLT',
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || 'admin@glbitm.ac.in',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || process.env.SEED_DEFAULT_PASSWORD || 'DemoStaff@2026!',
  SEED_DEFAULT_PASSWORD: process.env.SEED_DEFAULT_PASSWORD || 'DemoStaff@2026!'
};
