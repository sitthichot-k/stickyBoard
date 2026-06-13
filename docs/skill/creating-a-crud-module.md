# Skill: Creating a CRUD Module

Every backend feature is its own folder `modules/<feature>/` with
`controller/`, `models/`, `service/`, and a `<feature>.routes.js` — the service
composed from `createBaseService`. Follow this to add a new module
(example: `tag` → `modules/tag/`).

## 1. Model — `modules/tag/models/tag.model.js`

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

## 2. Service — `modules/tag/service/tag.service.js`

Compose the base service; override/extend only what differs.

```js
import { Tag } from '../models/tag.model.js';
import { createBaseService } from '../../../helpers/base.service.js';

const base = createBaseService(Tag, { searchableFields: ['name'] });

export const listTags = (opts) => base.searchAll(opts);
export const getTag = (id) => base.searchOne(id);
export const createTag = (payload) => base.create(payload);
export const updateTag = (id, payload) => base.update(id, payload);
export const deleteTag = (id) => base.delete(id);       // soft
export const restoreTag = (id) =>
  Tag.findByIdAndUpdate(id, { deletedAt: null }, { new: true });
```

## 3. Controller — `modules/tag/controller/tag.controller.js`

Thin: parse the request, call the service (`../service/tag.service.js`), shape
the response. Mirror `modules/note/controller/note.controller.js`.

## 4. Routes — `modules/tag/tag.routes.js` + mount it

```js
// modules/tag/tag.routes.js → import controller from './controller/tag.controller.js'

// src/routes/routes.js
import tagRoutes from '../modules/tag/tag.routes.js';
router.use('/tags', requireAuth, tagRoutes);
```

## 5. Frontend (if needed)

Add `modules/<feature>/api/<feature>.js` (mirror `modules/board/api/notes.js`,
importing `@/helpers/http.js`) and, if it needs shared state, a Pinia store
under the module's `stores/`.

## Conventions

- Controllers never call Mongoose directly — always go through a service.
- Add a `deletedAt` field to any model that should support delete/undo.
- Keep `toJSON` consistent (`id`, no `__v`, no `deletedAt`).
