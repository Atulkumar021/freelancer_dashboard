import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL is not set in .env');

  await mongoose.connect(uri, { bufferCommands: false });
  isConnected = true;
  console.log('[DB] Connected to MongoDB');
}
