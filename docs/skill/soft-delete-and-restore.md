# Skill: Soft Delete & Restore

Nothing is hard-deleted in normal operation. This keeps deletes reversible
(powering undo) without id remapping.

## How it works

A model opts in by declaring a `deletedAt` field (`Date`, default `null`):

- **Active** record → `deletedAt: null`
- **Deleted** record → `deletedAt: <timestamp>`

### Reads hide deleted records

`base.service.js` adds `{ deletedAt: null }` to every read filter
(`searchOne`, `searchAll`, `buildFilter`):

```js
const query = { deletedAt: null, ...filters };
```

> `{ deletedAt: null }` in MongoDB matches both *null* and *missing* fields, so
> the read filter is safe even on models that don't track soft deletes — but a
> model must declare `deletedAt` for a **write** (the delete) to persist, since
> Mongoose strict mode strips unknown fields.

### Delete writes the marker

```js
delete(id) {
  return model.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { deletedAt: new Date() },
    { new: true },
  );
}
```

### Restore clears the marker (same id)

Because the id never changes, restoring is just:

```js
export const restoreNote = (id) =>
  Note.findByIdAndUpdate(id, { deletedAt: null }, { new: true });
```

Exposed as `POST /api/notes/:id/restore` (and the same for connections). This is
what frontend **undo** of a delete calls — no recreation, no id remapping, so
arrows keep referencing the same note ids.

## Cascades

Deleting a note also soft-deletes its arrows
(`connection.service.deleteConnectionsForNote`). Undo restores the note and then
restores those specific connections by id.

## Gotcha

`findByIdAndUpdate(id, { deletedAt: null })` for restore intentionally does **not**
filter on `deletedAt: null` — it must target an already-deleted document.
