import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8081),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:8080',
  db: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/stickyBoard',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  // Seed admin (created by `npm run seed` if no users exist).
  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'admin1234',
  },
};

export const isProduction = env.nodeEnv === 'production';
