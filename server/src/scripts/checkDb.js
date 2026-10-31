import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Doctor } from '../models/Doctor.js';
import { Token } from '../models/Token.js';
import { User } from '../models/User.js';
import { Clinic } from '../models/Clinic.js';
import { Counter } from '../models/Counter.js';

const checkDatabase = async () => {
  console.log('=======================================================');
  console.log('  Smart Queue System - Database Diagnostic Inspector');
  console.log('=======================================================');

  const uri = env.MONGODB_URI;
  const isAtlas = uri.startsWith('mongodb+srv://');
  const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');

  console.log(`Target URI:    ${maskedUri}`);
  console.log(`Deploy Mode:   ${isAtlas ? '☁️  MongoDB Atlas (Cloud Cluster)' : '💻 Local MongoDB'}`);
  console.log('Connecting to database...');

  const startTime = Date.now();
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      family: 4
    });

    const connectLatency = Date.now() - startTime;
    console.log(`✅ Connection established in ${connectLatency} ms`);

    // Ping check
    const pingStart = Date.now();
    const pingRes = await conn.connection.db.admin().ping();
    const pingLatency = Date.now() - pingStart;
    console.log(`✅ Admin Ping: OK (Roundtrip: ${pingLatency} ms)`);

    // Inspect Collections
    const [doctorsCount, tokensCount, usersCount, clinicsCount, countersCount] = await Promise.all([
      Doctor.countDocuments(),
      Token.countDocuments(),
      User.countDocuments(),
      Clinic.countDocuments(),
      Counter.countDocuments()
    ]);

    console.log('\n📊 Collection Statistics:');
    console.log(`   • Clinics:     ${clinicsCount}`);
    console.log(`   • Doctors:     ${doctorsCount}`);
    console.log(`   • Staff Users: ${usersCount}`);
    console.log(`   • Total Tokens:${tokensCount}`);
    console.log(`   • Counters:    ${countersCount}`);

    // Verify Indexes on Tokens
    const tokenIndexes = await Token.collection.indexes();
    console.log('\n🛡️ Token Collection Indexes:');
    tokenIndexes.forEach((idx) => {
      const keys = Object.keys(idx.key).map((k) => `${k}:${idx.key[k]}`).join(', ');
      console.log(`   • ${idx.name} [${keys}] ${idx.unique ? '(UNIQUE)' : ''}`);
    });

    console.log('\n=======================================================');
    console.log('✅ DATABASE HEALTH: 100% OPERATIONAL');
    console.log('=======================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ DATABASE CONNECTION FAILED: ${err.message}`);
    console.error('\nTroubleshooting suggestions:');
    if (isAtlas) {
      console.error('  1. Check Network Access in MongoDB Atlas (ensure IP 0.0.0.0/0 is whitelisted).');
      console.error('  2. Verify database username and password in MONGODB_URI.');
    } else {
      console.error('  1. Ensure local MongoDB service is running (net start MongoDB or mongod).');
      console.error('  2. Check if port 27017 is accessible.');
    }
    process.exit(1);
  }
};

checkDatabase();

