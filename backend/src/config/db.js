import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDatabase() {
  mongoose.connection.on('connected', () => console.log('[db] MongoDB connected'));
  mongoose.connection.on('error', (err) => console.error('[db] MongoDB error', err));
  mongoose.connection.on('disconnected', () => console.log('[db] MongoDB disconnected'));

  await mongoose.connect(env.db.uri);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
