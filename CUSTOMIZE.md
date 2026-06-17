# Customizing / rebranding

This project is a **Vue + Node admin / RBAC starter** with a whiteboard as the
demo domain. The admin control-plane (auth, dynamic RBAC, config, logs,
notifications) is app-agnostic — swap the demo for your own domain and keep it.

## 1. Rebrand

| What | Where |
| --- | --- |
| App name ("Sticky Board") + 📌 logo | `frontend/src/App.vue` (`sidebar__brand`), the auth views (`modules/auth/views/*`), `frontend/index.html` `<title>` |
| Colours / accent themes | `frontend/src/styles/tokens.css` (+ the `ACCENTS` list in `App.vue`) |
| Email "from" / sender | `MAIL_FROM` env (or the Config → SMTP page) |
| Seed admin + secrets | root `.env` / `backend/.env` (`SEED_ADMIN_*`, `JWT_SECRET`, `MAIL_SECRET`) |

## 2. Swap the demo domain for yours

The whiteboard demo = backend modules `sheet · note · connection · stroke` (+ the
`board`/`tools` frontend modules). To replace it:

1. **Backend module** — follow [docs/skill/creating-a-crud-module.md](docs/skill/creating-a-crud-module.md)
   (the `base.service` factory gives you CRUD + soft-delete + pagination).
2. **Register the page** in `backend/src/modules/security/catalog.js` → `PAGES`
   (give it a `key`, `label`, `path`, `group`, and `apiPrefixes`). It then appears
   in the Permission Matrix automatically.
3. **Gate the routes** with `requirePermission('<pageKey>', '<capability>')`.
4. **Frontend** — add views + a route in `frontend/src/router/index.js` with
   `meta: { page: '<pageKey>' }`, and a sidebar entry in `App.vue` → `navGroups`.
5. *(optional)* **Notifications** — add events to
   `backend/src/modules/notification/catalog.js` and call `notify(eventKey, …)`
   where they should fire.

To drop the demo entirely, delete those modules + their routes/views/sidebar
entries and the `sheets` catalog page.

## 3. What admins configure from the UI (no code)

Once your domain modules declare their pages/events, **admins control behaviour
from the web**:

- **Permission Matrix** — which role can view/edit/delete/act on each page, owner
  scoping, and per-page log capture; plus custom roles.
- **Config** — rate limiting, traffic logging, log retention, registration,
  email verification, SMTP, and a blocked-IP monitor.
- **Notifications** — which action sends which email template (+ edit templates).
- **Settings** — the announcement banner. **Per-user themes** are client-side.

That dev-wires-the-catalog / admin-configures-the-behaviour split is the point of
the template.

## 4. Before you ship

- Set strong `JWT_SECRET` + `MAIL_SECRET`; change the seed admin password.
- `npm test` (both apps) and the CI workflow stay green.
- Replace [LICENSE](LICENSE) with your real terms; review deps with
  `npx license-checker --summary`.
- See the security/production checklist in [README](README.md).
