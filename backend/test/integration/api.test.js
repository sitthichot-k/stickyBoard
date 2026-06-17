import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/routes/app.js';
import { ensureSystemRoles } from '../../src/modules/security/service/role.service.js';
import { ensureDefaultPermissions } from '../../src/modules/security/service/permission.service.js';
import { createUser } from '../../src/modules/user/service/user.service.js';
import { setRuntime } from '../../src/modules/setting/service/runtime.service.js';
import { issueToken } from '../../src/modules/auth/service/token.service.js';

const BASE = '/api/v1';
let mongod;

beforeAll(async () => {
  mongoose.set('bufferCommands', true);
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await ensureSystemRoles();
  await ensureDefaultPermissions();
  // Don't trip the limiter mid-suite; skip traffic logging so no background
  // Log writes are in flight when we tear the connection down.
  await setRuntime({ rateLimitEnabled: false, logApiTraffic: false });
  await createUser({ email: 'admin@t.co', password: 'admin123', role: 'admin', emailVerified: true });
}, 120000); // generous — first CI run downloads the mongod binary

afterAll(async () => {
  await new Promise((r) => setTimeout(r, 200)); // let fire-and-forget logs settle
  await mongoose.disconnect();
  await mongod?.stop();
});

const login = (email, password) => request(app).post(`${BASE}/auth/login`).send({ email, password });
const token = async (email, password) => (await login(email, password)).body.token;

describe('auth', () => {
  it('rejects bad credentials', async () => {
    expect((await login('admin@t.co', 'wrong')).status).toBe(401);
  });

  it('logs in → token + resolved permissions', async () => {
    const res = await login('admin@t.co', 'admin123');
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.permissions).toBeTruthy();
  });

  it('blocks registration when disabled', async () => {
    const res = await request(app).post(`${BASE}/auth/register`).send({ email: 'a@gmail.com', password: 'pass123' });
    expect(res.status).toBe(403);
  });

  it('rejects fake-domain emails once registration is open', async () => {
    await setRuntime({ allowRegistration: true });
    const res = await request(app).post(`${BASE}/auth/register`).send({ email: 'x@example.com', password: 'pass123' });
    expect(res.status).toBe(400);
  });

  it('registers a real email, then requires verification before login', async () => {
    const reg = await request(app)
      .post(`${BASE}/auth/register`)
      .send({ email: 'real@gmail.com', password: 'pass123', name: 'Real' });
    expect(reg.status).toBe(201);

    const blocked = await login('real@gmail.com', 'pass123');
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('EMAIL_NOT_VERIFIED');

    const user = await mongoose.connection.collection('users').findOne({ email: 'real@gmail.com' });
    const raw = await issueToken(user._id, 'verify');
    expect((await request(app).post(`${BASE}/auth/verify-email`).send({ token: raw })).status).toBe(200);

    expect((await login('real@gmail.com', 'pass123')).status).toBe(200);
    await setRuntime({ allowRegistration: false });
  });
});

describe('RBAC enforcement', () => {
  it('401 without a token', async () => {
    expect((await request(app).get(`${BASE}/admin/users`)).status).toBe(401);
  });

  it('403 for a role without permission, 200 for admin', async () => {
    await createUser({ email: 'plain@t.co', password: 'pass123', role: 'user', emailVerified: true });
    const userToken = await token('plain@t.co', 'pass123');
    const adminToken = await token('admin@t.co', 'admin123');

    const denied = await request(app).get(`${BASE}/admin/users`).set('Authorization', `Bearer ${userToken}`);
    expect(denied.status).toBe(403);

    const allowed = await request(app).get(`${BASE}/admin/users`).set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
  });

  it('a regular user can list boards (default permission)', async () => {
    const userToken = await token('plain@t.co', 'pass123');
    const res = await request(app).get(`${BASE}/sheets`).set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });
});
