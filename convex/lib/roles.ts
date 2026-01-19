export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_PERMISSIONS = {
  [ROLES.USER]: [
    'scans.read',
    'scans.write',
    'scans.execute',
    'training.read',
    'training.write',
  ],
  [ROLES.ADMIN]: [
    'admin.access',
    'scans.read',
    'scans.write',
    'scans.execute',
    'training.read',
    'training.write',
  ],
} as const;

export const GUEST_PERMISSIONS = ['scans.read', 'training.read'];

export function mapPermissionsToRole(permissions: string[]): Role | null {
  if (permissions.includes('admin.access')) {
    return ROLES.ADMIN;
  }
  if (permissions.length > 0) {
    return ROLES.USER;
  }
  return null;
}

export function hasPermission(role: Role | null, permission: string): boolean {
  if (role === null) {
    return GUEST_PERMISSIONS.includes(permission);
  }
  return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

export function hasAnyPermission(role: Role | null, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role | null, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getPermissions(role: Role | null): string[] {
  if (role === null) {
    return GUEST_PERMISSIONS;
  }
  return [...(ROLE_PERMISSIONS[role] as readonly string[])];
}
