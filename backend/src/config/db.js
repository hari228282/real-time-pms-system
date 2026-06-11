import mongoose from 'mongoose';

import config from './index.js';

/**
 * Connect to MongoDB. We disable buffering so queries fail loudly when the DB is down
 * rather than hanging silently. The caller (server.js) awaits this before listening, so
 * the app never accepts traffic without a live database.
 */
export async function connectDB() {
  mongoose.set('strictQuery', true);
  mongoose.set('bufferCommands', false);

  await mongoose.connect(config.mongoUri);
  console.log('✅ MongoDB connected');

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
