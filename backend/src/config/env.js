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
  // Public base URL of the frontend — used to build links in emails.
  appUrl: process.env.APP_URL ?? 'http://localhost:8080',
  // Outbound email. With no SMTP host configured, mails are logged to the
  // console (dev/template friendly — works out of the box).
  mail: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'Sticky Board <no-reply@stickyboard.local>',
  },
  // Key used to encrypt secrets at rest (SMTP password). Falls back to the JWT
  // secret if unset — set a dedicated value in production.
  mailSecret: process.env.MAIL_SECRET ?? '',
};

export const isProduction = env.nodeEnv === 'production';
