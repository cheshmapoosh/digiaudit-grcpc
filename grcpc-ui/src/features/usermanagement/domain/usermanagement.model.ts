export interface UserRoleAssignment {
    id: string;
    roleId: string;
    roleCode: string;
    roleTitle: string;
    profileId: string;
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
    profileId: string | null;
    profileAdmin: boolean;
    defaultOrgUnitId: string | null;
    createdAt: string | null;
}

export interface UserDetail extends UserSummary {
    lastLoginAt: string | null;
    updatedAt: string | null;
    assignments: UserRoleAssignment[];
    profileAccessIds: string[];
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
export interface CreateUserInput {
    username: string; password: string; firstName: string; lastName: string;
    email?: string | null; mobile?: string | null; enabled: boolean; defaultOrgUnitId: null;
    profileId: string | null; profileAdmin: boolean; profileAccessIds: string[]; roleIds?: string[]; roleGrants?: ProfileRoleGrant[];
}

export interface UpdateUserInput {
    firstName: string; lastName: string; email: string | null; mobile: string | null;
    enabled: boolean; locked: boolean; defaultOrgUnitId: string | null;
    profileId: string | null; profileAdmin: boolean; profileAccessIds: string[]; roleIds?: string[]; roleGrants?: ProfileRoleGrant[];
}

export interface ProfileRoleGrant { roleId: string; validFrom: string | null; validTo: string | null }
