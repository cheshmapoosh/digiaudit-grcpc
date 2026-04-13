// src/shared/api/types.ts
export const AUDIT_FIELDS = [
    "id",
    "createdAt",
    "updatedAt",
    "createdBy",
    "updatedBy",
    "deletedAt",
    "deletedBy",
] as const;

export type AuditFields = (typeof AUDIT_FIELDS)[number];
