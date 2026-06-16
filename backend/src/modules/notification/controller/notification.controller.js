import * as templates from '../service/template.service.js';
import * as notify from '../service/notify.service.js';
import { recordLog } from '../../log/service/log.service.js';

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// --- Templates ---

export async function list(req, res, next) {
  try {
    res.json(await templates.listTemplates());
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, subject, body, description, key } = req.body ?? {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    const slug = (key && slugify(key)) || slugify(name);
    if (!slug) return res.status(400).json({ error: 'invalid key' });
    const tpl = await templates.createTemplate({
      key: slug,
      name: name.trim(),
      subject: String(subject ?? '').trim(),
      body: String(body ?? ''),
      description: String(description ?? '').trim(),
    });
    recordLog({ action: 'notification.template.create', message: `Created template ${slug}`, userId: req.user.id });
    res.status(201).json(tpl);
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: 'A template with this key already exists' });
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const b = req.body ?? {};
    const patch = {};
    if (b.name !== undefined) patch.name = String(b.name).trim();
    if (b.subject !== undefined) patch.subject = String(b.subject).trim();
    if (b.body !== undefined) patch.body = String(b.body);
    if (b.description !== undefined) patch.description = String(b.description).trim();
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'nothing to update' });
    const tpl = await templates.updateTemplate(req.params.key, patch);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    recordLog({ action: 'notification.template.update', message: `Updated template ${req.params.key}`, userId: req.user.id });
    res.json(tpl);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const tpl = await templates.deleteTemplate(req.params.key);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    recordLog({ level: 'warn', action: 'notification.template.delete', message: `Deleted template ${req.params.key}`, userId: req.user.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// --- Matrix (event → enabled + template) ---

export async function matrix(req, res, next) {
  try {
    res.json(await notify.getMatrix());
  } catch (err) {
    next(err);
  }
}

// Preview which catalog defaults a reset would affect (for the confirm warning).
export async function previewDefaults(req, res, next) {
  try {
    res.json(await notify.previewDefaults());
  } catch (err) {
    next(err);
  }
}

// Admin action — reset the catalog events' templates + rules to defaults.
export async function seedDefaults(req, res, next) {
  try {
    const result = await notify.seedDefaults();
    recordLog({
      level: 'warn',
      action: 'notification.seed',
      message: `Reset defaults: ${result.created} created, ${result.reset} reset`,
      userId: req.user.id,
      meta: result,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function setRule(req, res, next) {
  try {
    const { eventKey, enabled, templateKey } = req.body ?? {};
    if (!eventKey) return res.status(400).json({ error: 'eventKey is required' });
    const row = await notify.setRule(eventKey, { enabled, templateKey });
    recordLog({
      action: 'notification.rule.update',
      message: `Notification ${eventKey} → ${row.enabled ? 'on' : 'off'} (${row.templateKey})`,
      userId: req.user.id,
      meta: { eventKey, enabled: row.enabled, templateKey: row.templateKey },
    });
    res.json(row);
  } catch (err) {
    next(err);
  }
}
