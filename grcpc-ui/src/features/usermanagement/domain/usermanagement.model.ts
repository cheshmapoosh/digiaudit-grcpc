export interface UserRoleAssignment {
    id: string;
    roleId: string;
    roleCode: string;
    roleTitle: string;
    scopeType: string;
    scopeOrgUnitId: string | null;
    validFrom: string | null;
    validTo: string | null;
    assignedBy: string | null;
    assignedAt: string | null;
    active: boolean;
}

export interface UserSummary {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    mobile: string | null;
    email: string | null;
    enabled: boolean;
    locked: boolean;
    rootUser: boolean;
    defaultOrgUnitId: string | null;
    createdAt: string | null;
}

export interface UserDetail extends UserSummary {
    lastLoginAt: string | null;
    updatedAt: string | null;
    assignments: UserRoleAssignment[];
}

export interface LocalizedText {
    locale: string;
    title: string;
    description: string | null;
}

export interface PermissionItem {
    id: string;
    code: string;
    moduleName: string;
    title: string;
    description: string | null;
    createdAt: string | null;
}

export interface RoleSummary {
    id: string;
    code: string;
    title: string;
    description: string | null;
    systemDefined: boolean;
    enabled: boolean;
    createdAt: string | null;
}

export interface RoleDetail {
    id: string;
    code: string;
    systemDefined: boolean;
    enabled: boolean;
    createdAt: string | null;
    updatedAt: string | null;
    translations: LocalizedText[];
    systemPermissions: PermissionItem[];
    businessPermissions: PermissionItem[];
}