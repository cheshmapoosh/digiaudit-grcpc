export interface AuditFields {
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly createdBy?: string;
    readonly updatedBy?: string;
    readonly deletedAt?: string | null;
    readonly deletedBy?: string | null;
}
