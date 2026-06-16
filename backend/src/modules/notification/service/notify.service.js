import { EVENTS, getEvent, render } from '../catalog.js';
import { NotificationRule } from '../models/rule.model.js';
import { NotificationTemplate } from '../models/template.model.js';
import { getTemplate } from './template.service.js';
import { sendMail } from '../../setting/service/mail.service.js';
import { listAdminEmails } from '../../user/service/user.service.js';

const httpErr = (status, message) => Object.assign(new Error(message), { status });

// The matrix: every catalog event with its current rule state.
export async function getMatrix() {
  const rules = await NotificationRule.find();
  const byKey = Object.fromEntries(rules.map((r) => [r.eventKey, r]));
  return EVENTS.map((e) => {
    const rule = byKey[e.key];
    return {
      eventKey: e.key,
      page: e.page,
      label: e.label,
      recipient: e.recipient,
      system: e.system,
      vars: e.vars,
      enabled: e.system ? true : !!rule?.enabled,
      templateKey: rule?.templateKey || e.key,
    };
  });
}

// Update one event's rule (enable/disable + which template).
export async function setRule(eventKey, { enabled, templateKey } = {}) {
  const event = getEvent(eventKey);
  if (!event) throw httpErr(400, 'Unknown event');
  const patch = {};
  if (enabled !== undefined && !event.system) patch.enabled = Boolean(enabled);
  if (templateKey !== undefined) {
    if (templateKey && !(await getTemplate(templateKey))) throw httpErr(400, 'Unknown template');
    patch.templateKey = templateKey;
  }
  await NotificationRule.findOneAndUpdate({ eventKey }, { $set: patch }, { upsert: true });
  return (await getMatrix()).find((r) => r.eventKey === eventKey);
}

// Preview which catalog defaults a reset would touch — so the UI can warn before
// overwriting admin edits. Status per event: new | default | edited | deleted.
export async function previewDefaults() {
  const rows = [];
  for (const e of EVENTS) {
    const tpl = await NotificationTemplate.findOne({ key: e.key }); // incl. soft-deleted
    let status;
    if (!tpl) status = 'new';
    else if (tpl.deletedAt) status = 'deleted';
    else if (tpl.subject !== e.default.subject || tpl.body !== e.default.body) status = 'edited';
    else status = 'default';
    rows.push({ key: e.key, name: e.label, status });
  }
  return rows;
}

// Admin-triggered: reset the catalog events' templates + rules back to their
// built-in defaults. Reuses (and un-deletes) the existing key via deletedAt:null,
// so soft-deleted defaults come back without a unique-key clash. Returns counts.
export async function seedDefaults() {
  let created = 0;
  let reset = 0;
  for (const e of EVENTS) {
    const t = await NotificationTemplate.updateOne(
      { key: e.key },
      { $set: { name: e.label, subject: e.default.subject, body: e.default.body, description: 'Default template', deletedAt: null } },
      { upsert: true },
    );
    if (t.upsertedCount) created += 1;
    else reset += 1;
    await NotificationRule.updateOne(
      { eventKey: e.key },
      { $set: { enabled: !!e.system, templateKey: e.key } },
      { upsert: true },
    );
  }
  return { created, reset };
}

async function resolveRecipients(event, vars, to) {
  if (to) return [to];
  if (event.recipient === 'admins') return listAdminEmails();
  return vars.email ? [vars.email] : [];
}

/**
 * Send a notification for an event (fire-and-forget). Modules call this instead
 * of hardcoding emails. Skips silently when the event is disabled; system events
 * always send (with a built-in default if no template is configured).
 */
export async function notify(eventKey, { vars = {}, to } = {}) {
  try {
    const event = getEvent(eventKey);
    if (!event) return;
    const rule = await NotificationRule.findOne({ eventKey });
    if (!(event.system ? true : !!rule?.enabled)) return;

    const tpl = await getTemplate(rule?.templateKey || event.key);
    const subject = render(tpl?.subject ?? event.default.subject, vars);
    const text = render(tpl?.body ?? event.default.body, vars);
    const html = `<p>${text.replace(/\n/g, '<br>')}</p>`;

    for (const recipient of await resolveRecipients(event, vars, to)) {
      if (recipient) await sendMail({ to: recipient, subject, text, html });
    }
  } catch (err) {
    console.error('[notify] failed:', err.message);
  }
}
