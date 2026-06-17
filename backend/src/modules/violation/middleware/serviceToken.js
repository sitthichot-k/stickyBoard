import { env } from '../../../config/env.js';

// Guards the AI-service-only endpoints (RTSP sources + violation ingest). The
// Python inference service presents a shared secret in `X-Service-Token`. When
// no token is configured the endpoints stay closed (401) so they can never be
// reached unauthenticated.
export function requireServiceToken(req, res, next) {
  const token = req.get('X-Service-Token') || '';
  if (env.ai.serviceToken && token === env.ai.serviceToken) return next();
  return res.status(401).json({ error: 'Invalid service token' });
}
