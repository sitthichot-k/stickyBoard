import * as roles from '../service/role.service.js';
import * as perms from '../service/permission.service.js';
import { PAGES, CAPABILITIES, PAGE_KEYS, CAPABILITY_KEYS, ADMIN_ROLE } from '../catalog.js';
import { recordLog } from '../../log/service/log.service.js';

// GET /security/catalog — pages + capability columns for the matrix UI.
export async function catalog(req, res, next) {
  try {
    res.json({ pages: PAGES, capabilities: CAPABILITIES });
  } catch (err) {
    next(err);
  }
}

// --- Roles ---

export async function listRoles(req, res, next) {
  try {
    res.json(await roles.listRoles());
  } catch (err) {
    next(err);
  }
}

export async function createRole(req, res, next) {
  try {
    const { key, name, description } = req.body ?? {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    const role = await roles.createRole({ key, name, description });
    recordLog({
      action: 'role.create',
      message: `Created role ${role.name} (${role.key})`,
      userId: req.user.id,
      meta: { roleKey: role.key },
    });
    res.status(201).json(role);
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: 'A role with this key already exists' });
    next(err);
  }
}

export async function updateRole(req, res, next) {
  try {
    const role = await roles.getRole(req.params.key);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.isSystem) return res.status(400).json({ error: 'System roles cannot be modified' });
    const { name, description } = req.body ?? {};
    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (description !== undefined) patch.description = String(description).trim();
    const updated = await roles.updateRole(req.params.key, patch);
    recordLog({
      action: 'role.update',
      message: `Updated role ${updated.key}`,
      userId: req.user.id,
      meta: { roleKey: updated.key },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function removeRole(req, res, next) {
  try {
    const role = await roles.getRole(req.params.key);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.isSystem) return res.status(400).json({ error: 'System roles cannot be deleted' });
    await roles.softDeleteRole(req.params.key);
    await perms.clearRole(req.params.key); // drop its permission rows
    recordLog({
      level: 'warn',
      action: 'role.delete',
      message: `Deleted role ${role.key}`,
      userId: req.user.id,
      meta: { roleKey: role.key },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// --- Permission matrix ---

// GET /security/matrix?role=<key>
export async function getMatrix(req, res, next) {
  try {
    const roleKey = req.query.role;
    if (!roleKey) return res.status(400).json({ error: 'role query param is required' });
    const role = await roles.getRole(roleKey);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json({ role: role.key, rows: await perms.getMatrix(roleKey) });
  } catch (err) {
    next(err);
  }
}

// PUT /security/matrix — body { roleKey, pageKey, granted: [...] }
export async function setMatrixRow(req, res, next) {
  try {
    const { roleKey, pageKey, granted } = req.body ?? {};
    if (!roleKey || !pageKey) return res.status(400).json({ error: 'roleKey and pageKey are required' });
    if (roleKey === ADMIN_ROLE) return res.status(400).json({ error: 'The admin role always has full access and cannot be edited' });
    if (!(await roles.getRole(roleKey))) return res.status(404).json({ error: 'Role not found' });
    if (!PAGE_KEYS.includes(pageKey)) return res.status(400).json({ error: 'Unknown page' });
    if (!Array.isArray(granted)) return res.status(400).json({ error: 'granted must be an array' });
    const invalid = granted.filter((c) => !CAPABILITY_KEYS.includes(c));
    if (invalid.length) return res.status(400).json({ error: `Unknown capabilities: ${invalid.join(', ')}` });

    const row = await perms.setRow(roleKey, pageKey, granted);
    recordLog({
      action: 'permission.update',
      message: `Set ${roleKey} · ${pageKey} → [${row.granted.join(', ') || '—'}]`,
      userId: req.user.id,
      meta: { roleKey, pageKey, granted: row.granted },
    });
    res.json(row);
  } catch (err) {
    next(err);
  }
}
