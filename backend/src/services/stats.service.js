import { User } from '../models/user.model.js';
import { Sheet } from '../models/sheet.model.js';
import { Note } from '../models/note.model.js';
import { Connection } from '../models/connection.model.js';
import { Stroke } from '../models/stroke.model.js';

const active = { deletedAt: null };
const ACTIVITY_DAYS = 14;

export async function getStats() {
  const [users, admins, sheets, notes, connections, strokes] = await Promise.all([
    User.countDocuments(active),
    User.countDocuments({ ...active, role: 'admin' }),
    Sheet.countDocuments(active),
    Note.countDocuments(active),
    Connection.countDocuments(active),
    Stroke.countDocuments(active),
  ]);

  // Top sheets by note count.
  const notesPerSheet = await Note.aggregate([
    { $match: active },
    { $group: { _id: '$sheetId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'sheets', localField: '_id', foreignField: '_id', as: 'sheet' } },
    { $unwind: { path: '$sheet', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, name: { $ifNull: ['$sheet.name', 'Unknown'] }, count: 1 } },
  ]);

  // Notes created per day over the last ACTIVITY_DAYS (zero-filled).
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (ACTIVITY_DAYS - 1));
  const raw = await Note.aggregate([
    { $match: { ...active, createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
  ]);
  const byDay = Object.fromEntries(raw.map((r) => [r._id, r.count]));
  const activity = [];
  for (let i = 0; i < ACTIVITY_DAYS; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    activity.push({ date, count: byDay[date] ?? 0 });
  }

  return {
    counts: { users, admins, sheets, notes, connections, strokes },
    notesPerSheet,
    activity,
  };
}
