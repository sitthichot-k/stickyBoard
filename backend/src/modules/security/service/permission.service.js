import { Permission } from '../models/permission.model.js';
import { PAGES, CAPABILITY_KEYS, ADMIN_ROLE, DEFAULT_PERMISSIONS } from '../catalog.js';

// All permission rows for a role, as a { pageKey: Set(caps) } lookup.
async function grantsForRole(roleKey) {
  const rows = await Permission.find({ roleKey });
  const map = new Map();
  for (const row of rows) map.set(row.pageKey, new Set(row.granted));
  return map;
}

// The full matrix for one role: every catalogue page with its granted caps.
// The admin role is implicitly all-on and not stored.
export async function getMatrix(roleKey) {
  const isAdmin = roleKey === ADMIN_ROLE;
  const map = isAdmin ? null : await grantsForRole(roleKey);
  return PAGES.map((page) => {
    const granted = isAdmin ? [...CAPABILITY_KEYS] : [...(map.get(page.key) ?? [])];
    return { pageKey: page.key, granted };
  });
}

// Compact { pageKey: [caps] } map of everything a role can do — sent to the
// frontend (via /auth/me) to drive route guards and the sidebar.
export async function permissionsForRole(roleKey) {
  const rows = await getMatrix(roleKey);
  const out = {};
  for (const row of rows) if (row.granted.length) out[row.pageKey] = row.granted;
  return out;
}

// Replace a single cell's granted list (validated against the catalogue).
export async function setRow(roleKey, pageKey, granted) {
  const clean = [...new Set(granted)].filter((c) => CAPABILITY_KEYS.includes(c));
  return Permission.findOneAndUpdate(
    { roleKey, pageKey },
    { $set: { granted: clean } },
    { new: true, upsert: true },
  );
}

// --- Enforcement helpers (used by middleware in BE-2b) ---

// Does a role have a capability on a page? Admin always does. ("All" is a
// UI-only master toggle — it just turns the access caps on, so it isn't stored.)
export async function can(roleKey, pageKey, capability) {
  if (roleKey === ADMIN_ROLE) return true;
  const row = await Permission.findOne({ roleKey, pageKey });
  return row ? row.granted.includes(capability) : false;
}

// Remove every rule for a role (when a custom role is deleted).
export const clearRole = (roleKey) => Permission.deleteMany({ roleKey });

// Seed the default matrix the first time it's empty. Idempotent and
// non-destructive — once any rule exists (admin has configured things) it does
// nothing, so it's safe to run on every boot.
export async function ensureDefaultPermissions() {
  if ((await Permission.estimatedDocumentCount()) > 0) return;
  const ops = [];
  for (const [roleKey, pages] of Object.entries(DEFAULT_PERMISSIONS)) {
    for (const [pageKey, granted] of Object.entries(pages)) {
      ops.push(setRow(roleKey, pageKey, granted));
    }
  }
  await Promise.all(ops);
}
