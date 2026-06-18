import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/routes/app.js';
import { env } from '../../src/config/env.js';
import { ensureSystemRoles } from '../../src/modules/security/service/role.service.js';
import { ensureDefaultPermissions } from '../../src/modules/security/service/permission.service.js';
import { createUser } from '../../src/modules/user/service/user.service.js';
import { setRuntime } from '../../src/modules/setting/service/runtime.service.js';
import { createCamera } from '../../src/modules/camera/service/camera.service.js';

const BASE = '/api/v1';
const TOKEN = 'test-service-token';
let mongod;
let cameraId;

beforeAll(async () => {
  mongoose.set('bufferCommands', true);
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await ensureSystemRoles();
  await ensureDefaultPermissions();
  await setRuntime({ rateLimitEnabled: false, logApiTraffic: false });
  env.ai.serviceToken = TOKEN;
  await createUser({ email: 'admin@t.co', password: 'admin123', role: 'admin', emailVerified: true });
  const cam = await createCamera({
    name: 'Gate In',
    url: 'rtsp://u:p@host:554/s',
    enabled: true,
    gate: 'entrance',
    countVehicles: true,
  });
  cameraId = cam.id;
}, 120000);

afterAll(async () => {
  await new Promise((r) => setTimeout(r, 200));
  await mongoose.disconnect();
  await mongod?.stop();
});

const adminToken = async () =>
  (await request(app).post(`${BASE}/auth/login`).send({ email: 'admin@t.co', password: 'admin123' })).body.token;

const ingest = (body) =>
  request(app).post(`${BASE}/vehicle-counts/ingest`).set('X-Service-Token', TOKEN).send(body);

describe('vehicle-count ingest', () => {
  it('401 without the service token', async () => {
    const res = await request(app).post(`${BASE}/vehicle-counts/ingest`).send({ cameraId, gate: 'entrance', type: 'car' });
    expect(res.status).toBe(401);
  });

  it('records a count, then de-dupes the same track', async () => {
    const first = await ingest({ cameraId, gate: 'entrance', type: 'car', trackId: '7' });
    expect(first.status).toBe(201);
    expect(first.body.deduped).toBe(false);

    const dup = await ingest({ cameraId, gate: 'entrance', type: 'car', trackId: '7' });
    expect(dup.status).toBe(200);
    expect(dup.body.deduped).toBe(true);
  });

  it('counts another type/track', async () => {
    expect((await ingest({ cameraId, gate: 'entrance', type: 'motorcycle', trackId: '8' })).status).toBe(201);
  });

  it('400 on a bad type or gate', async () => {
    expect((await ingest({ cameraId, gate: 'entrance', type: 'plane', trackId: '9' })).status).toBe(400);
    expect((await ingest({ cameraId, gate: 'sideways', type: 'car', trackId: '9' })).status).toBe(400);
  });
});

describe('admin stats include the vehicle-count summary', () => {
  it('returns in/out totals + by-type + trend', async () => {
    const tok = await adminToken();
    const res = await request(app).get(`${BASE}/admin/stats`).set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    const vc = res.body.vehicleCounts;
    expect(vc).toBeTruthy();
    expect(vc.totals.in).toBeGreaterThanOrEqual(2); // car + motorcycle
    expect(vc.byType.entrance.car).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(vc.trend)).toBe(true);
  });
});
