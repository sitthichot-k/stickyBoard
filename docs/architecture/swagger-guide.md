# API docs (Swagger / OpenAPI)

Interactive API docs are generated from `@openapi` JSDoc blocks and served by the
backend with Swagger UI.

## Open it

- **Dev:** http://localhost:8081/api/docs (raw spec: `/api/docs.json`)
- Disabled in **production** unless you set `SWAGGER_ENABLED=true`.

## Authenticate ("Try it out")

1. `POST /auth/login` with a seeded account (`admin@example.com` / `admin1234`).
2. Copy the `token` from the response.
3. Click **Authorize** (top-right) and paste the token — Swagger sends it as
   `Authorization: Bearer <token>` on every call.
4. Most endpoints need this; access is then checked against the permission matrix
   (admin passes everything).

## How it's wired

- `config/swagger.js` — the base spec (info, server `/api/v1`, the `bearerAuth`
  security scheme) and the glob it scans: `./src/swagger/*.js`.
- `src/swagger/*.swagger.js` — one file per area holding `@openapi` blocks for the
  paths + schemas. Kept separate so the route files stay thin.
- `routes/app.js` mounts Swagger UI at `/api/docs`.

## Document a new endpoint

Add (or extend) a block in `src/swagger/`:

```js
/**
 * @openapi
 * /things/{id}:
 *   get:
 *     tags: [Things]
 *     summary: Get one thing
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: A thing }
 *       404: { description: Not found }
 */
```

- Paths are relative to the server URL (`/api/v1`), so write `/things`, not
  `/api/v1/things`.
- Reuse shared shapes with `$ref: '#/components/schemas/<Name>'`; define schemas in
  a `components: { schemas: { … } }` block.
- Use `security: []` to mark an endpoint public (e.g. `login`, `register`).

The full hand-written reference is in [rest-api.md](rest-api.md); Swagger is the
live, try-it-out view.
