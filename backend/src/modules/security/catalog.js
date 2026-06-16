/**
 * Static catalog of the app's pages and the permission capabilities that can be
 * toggled per role. This is the single source of truth shared by the backend
 * (enforcement) and the frontend (matrix UI + route guards + sidebar).
 *
 * `key` matches the Vue route `name` so the frontend can resolve a route to its
 * permission page. `apiPrefixes` lists the API paths a page owns, used to map an
 * incoming request to its page for enforcement and the dynamic traffic logger.
 */

// The toggle columns in the permission matrix (order = column order in the UI).
export const CAPABILITIES = [
  { key: 'view', label: 'View', help: 'Open the page and read its data' },
  { key: 'edit', label: 'Edit', help: 'Create and update' },
  { key: 'delete', label: 'Delete', help: 'Delete records' },
  { key: 'action', label: 'Action', help: 'Special actions (restore, export, …)' },
  { key: 'owner', label: 'Owner', help: 'See only records the user owns' },
  { key: 'logs', label: 'Logs', help: 'Record activity from this page to the logs' },
];

export const CAPABILITY_KEYS = CAPABILITIES.map((c) => c.key);

// Capabilities that grant access/actions (the "All" master toggle covers these).
// `owner` and `logs` are modifiers, not access grants, so they're excluded.
export const ACCESS_CAPS = ['view', 'edit', 'delete', 'action'];

export const PAGES = [
  {
    key: 'sheets',
    label: 'Boards',
    path: '/',
    group: 'Boards',
    ownerScoped: true,
    apiPrefixes: ['/api/v1/sheets', '/api/v1/notes', '/api/v1/connections', '/api/v1/strokes'],
  },
  { key: 'merge-pdf', label: 'Merge PDF', path: '/tools/merge-pdf', group: 'Tools', apiPrefixes: [] },
  { key: 'scan-pdf', label: 'Scan to PDF', path: '/tools/scan-pdf', group: 'Tools', apiPrefixes: [] },
  {
    key: 'admin-dashboard',
    label: 'Dashboard',
    path: '/admin/dashboard',
    group: 'Admin',
    apiPrefixes: ['/api/v1/admin/stats'],
  },
  {
    key: 'admin-users',
    label: 'Users',
    path: '/admin/users',
    group: 'Admin',
    apiPrefixes: ['/api/v1/admin/users'],
  },
  {
    key: 'admin-settings',
    label: 'Settings',
    path: '/admin/settings',
    group: 'Admin',
    apiPrefixes: ['/api/v1/settings'],
  },
  {
    key: 'admin-config',
    label: 'Config',
    path: '/admin/config',
    group: 'Admin',
    apiPrefixes: ['/api/v1/settings/runtime', '/api/v1/settings/mail'],
  },
  {
    key: 'admin-logs',
    label: 'Logs',
    path: '/admin/logs',
    group: 'Admin',
    apiPrefixes: ['/api/v1/logs'],
  },
  {
    key: 'admin-security',
    label: 'Permission Matrix',
    path: '/admin/security',
    group: 'Admin',
    apiPrefixes: ['/api/v1/security'],
  },
];

export const PAGE_KEYS = PAGES.map((p) => p.key);
export const getPage = (key) => PAGES.find((p) => p.key === key) || null;

// Resolve an API request path to the page that owns it (longest prefix wins).
export function pageForApiPath(path) {
  let best = null;
  let bestLen = -1;
  for (const page of PAGES) {
    for (const prefix of page.apiPrefixes ?? []) {
      if (path.startsWith(prefix) && prefix.length > bestLen) {
        best = page;
        bestLen = prefix.length;
      }
    }
  }
  return best;
}

// System roles that always exist. `admin` is implicitly full-access and not
// editable; `user` is the default role assigned to new accounts.
export const SYSTEM_ROLES = [
  { key: 'admin', name: 'Admin', description: 'Full access to everything', isSystem: true },
  { key: 'user', name: 'User', description: 'Default role', isSystem: true },
];

export const ADMIN_ROLE = 'admin';

// Default permissions seeded the first time the matrix is empty (admin is
// implicitly full-access, so only the `user` role needs defaults). Boards are
// fully usable and owner-scoped; the PDF tools are view-only; no admin pages.
const BOARD_CAPS = ['view', 'edit', 'delete', 'action', 'owner', 'logs'];
export const DEFAULT_PERMISSIONS = {
  user: {
    sheets: BOARD_CAPS,
    'merge-pdf': ['view'],
    'scan-pdf': ['view'],
  },
};
