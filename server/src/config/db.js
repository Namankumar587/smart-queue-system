import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  const isAtlas = env.MONGODB_URI.startsWith('mongodb+srv://');

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: isAtlas ? 10000 : 5000,
      maxPoolSize: isAtlas ? 25 : 10,
      minPoolSize: isAtlas ? 2 : 1,
      socketTimeoutMS: 45000,
      family: 4, // IPv4 first for reliable DNS SRV resolution
      autoIndex: env.NODE_ENV !== 'production'
    });

    isConnected = true;
    const hostType = isAtlas ? 'MongoDB Atlas (Cloud Cluster)' : `Local MongoDB (${conn.connection.host})`;
    console.log(`[MongoDB] Connected successfully to: ${hostType}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB Runtime Error]: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('[MongoDB Warning]: Disconnected from server.');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      console.log('[MongoDB Info]: Reconnected successfully.');
    });
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    // In development/test we keep server alive even if Mongo is momentarily reconnecting
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export const checkDBHealth = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Disconnected.');
  }
};
