# Skill: Creating a CRUD Module

Every backend feature follows the same shape: `model → service → controller →
routes`, with the service composed from `createBaseService`. Follow this to add
a new module (example: `tag`).

## 1. Model — `models/tag.model.js`

```js
import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Required for soft delete + restore to work.
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.deletedAt;
        return ret;
      },
    },
  },
);

export const Tag = mongoose.model('Tag', tagSchema);
```

## 2. Service — `services/tag.service.js`

Compose the base service; override/extend only what differs.

```js
import { Tag } from '../models/tag.model.js';
import { createBaseService } from './base.service.js';

const base = createBaseService(Tag, { searchableFields: ['name'] });

export const listTags = (opts) => base.searchAll(opts);
export const getTag = (id) => base.searchOne(id);
export const createTag = (payload) => base.create(payload);
export const updateTag = (id, payload) => base.update(id, payload);
export const deleteTag = (id) => base.delete(id);       // soft
export const restoreTag = (id) =>
  Tag.findByIdAndUpdate(id, { deletedAt: null }, { new: true });
```

## 3. Controller — `controllers/tag.controller.js`

Thin: parse the request, call the service, shape the response. Mirror
`note.controller.js` / `connection.controller.js`.

## 4. Routes — `routes/tag.routes.js` + mount it

```js
// routes/index.js
import tagRoutes from './tag.routes.js';
router.use('/tags', tagRoutes);
```

## 5. Frontend (if needed)

Add an `api/tags.js` wrapper (mirror `api/notes.js`) and, if it needs shared
state, a Pinia store or fields on the existing one.

## Conventions

- Controllers never call Mongoose directly — always go through a service.
- Add a `deletedAt` field to any model that should support delete/undo.
- Keep `toJSON` consistent (`id`, no `__v`, no `deletedAt`).
