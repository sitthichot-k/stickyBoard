import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';
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
const SERVICE_TOKEN = 'test-service-token';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG magic — stands in for an image

let mongod;
let cameraId;
let snapDir;

beforeAll(async () => {
  mongoose.set('bufferCommands', true);
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await ensureSystemRoles();
  await ensureDefaultPermissions();
  await setRuntime({ rateLimitEnabled: false, logApiTraffic: false });

  // Configure the AI surface for this run (env is a mutable singleton).
  snapDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sticky-snap-'));
  env.ai.serviceToken = SERVICE_TOKEN;
  env.ai.snapshotDir = snapDir;

  await createUser({ email: 'admin@t.co', password: 'admin123', role: 'admin', emailVerified: true });
  const cam = await createCamera({ name: 'Gate Cam', url: 'rtsp://u:p@host:554/s', enabled: true, aiEnabled: true });
  cameraId = cam.id;
}, 120000);

afterAll(async () => {
  await new Promise((r) => setTimeout(r, 200));
  await mongoose.disconnect();
  await mongod?.stop();
  fs.rmSync(snapDir, { recursive: true, force: true });
});

const adminToken = async () =>
  (await request(app).post(`${BASE}/auth/login`).send({ email: 'admin@t.co', password: 'admin123' })).body.token;

const ingest = (q = `cameraId=${cameraId}&confidence=0.9&trackId=abc`) =>
  request(app)
    .post(`${BASE}/violations/ingest?${q}`)
    .set('Content-Type', 'image/jpeg');

describe('violation ingest (AI service)', () => {
  it('rejects a missing/invalid service token', async () => {
    const res = await ingest().send(PNG);
    expect(res.status).toBe(401);
  });

  it('accepts a violation with a valid token and stores the snapshot', async () => {
    const res = await ingest().set('X-Service-Token', SERVICE_TOKEN).send(PNG);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.deduped).toBe(false);
    expect(fs.existsSync(path.join(snapDir, `${res.body.id}.jpg`))).toBe(true);
  });

  it('de-dupes the same tracked rider within the window', async () => {
    const res = await ingest().set('X-Service-Token', SERVICE_TOKEN).send(PNG);
    expect(res.status).toBe(200);
    expect(res.body.deduped).toBe(true);
  });

  it('400s on an invalid cameraId', async () => {
    const res = await request(app)
      .post(`${BASE}/violations/ingest?cameraId=nope`)
      .set('X-Service-Token', SERVICE_TOKEN)
      .set('Content-Type', 'image/jpeg')
      .send(PNG);
    expect(res.status).toBe(400);
  });
});

describe('violation admin API (RBAC)', () => {
  it('lists, reviews, serves the snapshot, and deletes', async () => {
    const tok = await adminToken();

    const list = await request(app).get(`${BASE}/violations`).set('Authorization', `Bearer ${tok}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    const v = list.body.data[0];
    expect(v.snapshotPath).toBeUndefined(); // internal path never leaked

    const reviewed = await request(app)
      .patch(`${BASE}/violations/${v.id}`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ status: 'reviewed' });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.status).toBe('reviewed');
    expect(reviewed.body.reviewedBy).toBeTruthy();

    const img = await request(app).get(`${BASE}/violations/${v.id}/snapshot`).set('Authorization', `Bearer ${tok}`);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toContain('image/jpeg');

    const del = await request(app).delete(`${BASE}/violations/${v.id}`).set('Authorization', `Bearer ${tok}`);
    expect(del.status).toBe(204);
  });

  it('401s without a token', async () => {
    expect((await request(app).get(`${BASE}/violations`)).status).toBe(401);
  });
});

describe('admin stats include the violation summary', () => {
  it('returns a violations block', async () => {
    const tok = await adminToken();
    const res = await request(app).get(`${BASE}/admin/stats`).set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.violations).toBeTruthy();
    expect(res.body.violations).toHaveProperty('total');
    expect(Array.isArray(res.body.violations.trend)).toBe(true);
  });
});
