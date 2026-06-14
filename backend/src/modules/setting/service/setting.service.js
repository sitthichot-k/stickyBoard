import { Setting } from '../models/setting.model.js';

// Known settings + their defaults. Add new configurable points here.
export const DEFAULTS = {
  announcement: { enabled: false, message: '', level: 'info' }, // site-wide banner
};
export const ALLOWED_KEYS = Object.keys(DEFAULTS);

// All settings merged with defaults (admin view).
export async function getAll() {
  const docs = await Setting.find();
  const stored = Object.fromEntries(docs.map((d) => [d.key, d.value]));
  const out = {};
  for (const key of ALLOWED_KEYS) {
    out[key] =
      stored[key] && typeof stored[key] === 'object'
        ? { ...DEFAULTS[key], ...stored[key] }
        : (stored[key] ?? DEFAULTS[key]);
  }
  return out;
}

// Settings safe to expose to any signed-in user (for display).
export async function getPublic() {
  const all = await getAll();
  return { announcement: all.announcement };
}

// Validate/normalise a value before storing.
export function clean(key, value) {
  if (key === 'announcement') {
    const LEVELS = ['info', 'warning', 'danger'];
    return {
      enabled: Boolean(value?.enabled),
      message: String(value?.message ?? '').slice(0, 500),
      level: LEVELS.includes(value?.level) ? value.level : 'info',
    };
  }
  return value;
}

export async function setSetting(key, value) {
  const doc = await Setting.findOneAndUpdate(
    { key },
    { value: clean(key, value) },
    { upsert: true, new: true },
  );
  return doc.value;
}
