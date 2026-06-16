import { NotificationTemplate } from '../models/template.model.js';
import { createBaseService } from '../../../helpers/base.service.js';

const base = createBaseService(NotificationTemplate, { searchableFields: ['name', 'key', 'subject'] });

export const listTemplates = () => NotificationTemplate.find({ deletedAt: null }).sort({ name: 1 });
export const getTemplate = (key) => NotificationTemplate.findOne({ key, deletedAt: null });
export const createTemplate = (payload) => base.create(payload);
export const updateTemplate = (key, patch) =>
  NotificationTemplate.findOneAndUpdate({ key, deletedAt: null }, patch, { new: true, runValidators: true });
export const deleteTemplate = (key) =>
  NotificationTemplate.findOneAndUpdate({ key, deletedAt: null }, { deletedAt: new Date() }, { new: true });
