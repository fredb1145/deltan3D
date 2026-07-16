export type AdminRole =
  | 'super_admin'
  | 'user_admin'
  | 'subscription_admin'
  | 'analytics_admin'
  | 'custom';

export type AdminModule =
  | 'overview'
  | 'users'
  | 'tours'
  | 'plans'
  | 'analytics'
  | 'admins';

export type AdminPermission =
  | 'users.read'
  | 'users.manage'
  | 'tours.read'
  | 'tours.manage'
  | 'plans.read'
  | 'plans.manage'
  | 'analytics.read'
  | 'admins.manage'
  | 'overview.read';

const ALL_PERMISSIONS: AdminPermission[] = [
  'users.read',
  'users.manage',
  'tours.read',
  'tours.manage',
  'plans.read',
  'plans.manage',
  'analytics.read',
  'admins.manage',
  'overview.read',
];

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: ALL_PERMISSIONS,
  user_admin: ['users.read', 'users.manage', 'overview.read'],
  subscription_admin: ['plans.read', 'plans.manage', 'overview.read'],
  analytics_admin: ['analytics.read', 'overview.read'],
  custom: [],
};

export type AdminAccess = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: AdminRole;
  permissions: Set<AdminPermission>;
};

function normalizeRole(value: string | null | undefined): AdminRole {
  if (value === 'super_admin') return 'super_admin';
  if (value === 'user_admin') return 'user_admin';
  if (value === 'subscription_admin') return 'subscription_admin';
  if (value === 'analytics_admin') return 'analytics_admin';
  if (value === 'custom') return 'custom';
  return 'super_admin';
}

function isAdminPermission(value: any): value is AdminPermission {
  return typeof value === 'string' && (ALL_PERMISSIONS as string[]).includes(value);
}

export function resolveAdminAccess(profile: any): AdminAccess {
  const isAdmin = profile?.is_admin === true;

  if (!isAdmin) {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      role: 'custom',
      permissions: new Set(),
    };
  }

  const role = normalizeRole(profile?.admin_role);
  const customPermissions = Array.isArray(profile?.admin_permissions)
    ? profile.admin_permissions.filter(isAdminPermission)
    : [];
  const basePermissions = customPermissions.length
    ? customPermissions
    : ROLE_PERMISSIONS[role];

  const permissions =
    basePermissions.length > 0 ? basePermissions : ROLE_PERMISSIONS.super_admin;

  return {
    isAdmin: true,
    isSuperAdmin: role === 'super_admin',
    role,
    permissions: new Set(permissions),
  };
}

export function canAccessModule(access: AdminAccess, module: AdminModule) {
  if (!access.isAdmin) return false;

  const required: Record<AdminModule, AdminPermission[]> = {
    overview: ['overview.read'],
    users: ['users.read'],
    tours: ['tours.read'],
    plans: ['plans.read'],
    analytics: ['analytics.read'],
    admins: ['admins.manage'],
  };

  return required[module].some(permission => access.permissions.has(permission));
}

export function hasAdminPermission(access: AdminAccess, permission: AdminPermission) {
  if (!access.isAdmin) {
    return false;
  }

  return access.permissions.has(permission);
}
