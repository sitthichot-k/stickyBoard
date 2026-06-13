import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8081),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:8080',
  db: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/stickyBoard',
  },
};

export const isProduction = env.nodeEnv === 'production';
