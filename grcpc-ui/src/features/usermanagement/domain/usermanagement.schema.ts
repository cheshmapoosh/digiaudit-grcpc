import { z } from "zod";

export const userRoleAssignmentSchema = z.object({
    id: z.string(),
    roleId: z.string(),
    roleCode: z.string(),
    roleTitle: z.string(),
    scopeType: z.string(),
    scopeOrgUnitId: z.string().nullable(),
    validFrom: z.string().nullable(),
    validTo: z.string().nullable(),
    assignedBy: z.string().nullable(),
    assignedAt: z.string().nullable(),
    active: z.boolean(),
});

export const userSummarySchema = z.object({
    id: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    mobile: z.string().nullable(),
    email: z.string().nullable(),
    enabled: z.boolean(),
    locked: z.boolean(),
    rootUser: z.boolean(),
    defaultOrgUnitId: z.string().nullable(),
    createdAt: z.string().nullable(),
});

export const userDetailSchema = userSummarySchema.extend({
    lastLoginAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
    assignments: z.array(userRoleAssignmentSchema),
});

export const localizedTextSchema = z.object({
    locale: z.string(),
    title: z.string(),
    description: z.string().nullable(),
});

export const permissionItemSchema = z.object({
    id: z.string(),
    code: z.string(),
    moduleName: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    createdAt: z.string().nullable(),
});

export const roleSummarySchema = z.object({
    id: z.string(),
    code: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    systemDefined: z.boolean(),
    enabled: z.boolean(),
    createdAt: z.string().nullable(),
});

export const roleDetailSchema = roleSummarySchema.extend({
    updatedAt: z.string().nullable(),
    translations: z.array(localizedTextSchema),
    systemPermissions: z.array(permissionItemSchema),
    businessPermissions: z.array(permissionItemSchema),
});

export const userSummaryListSchema = z.array(userSummarySchema);
export const roleSummaryListSchema = z.array(roleSummarySchema);

export type UserSummaryDto = z.infer<typeof userSummarySchema>;
export type UserDetailDto = z.infer<typeof userDetailSchema>;
export type UserRoleAssignmentDto = z.infer<typeof userRoleAssignmentSchema>;
export type RoleSummaryDto = z.infer<typeof roleSummarySchema>;
export type RoleDetailDto = z.infer<typeof roleDetailSchema>;
export type PermissionItemDto = z.infer<typeof permissionItemSchema>;
