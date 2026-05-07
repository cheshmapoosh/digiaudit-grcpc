import type { AuditFields } from "@/shared/domain/audit.model";

export type AccountGroupStatus = "active" | "inactive";

export type AccountGroupImportance = "low" | "medium" | "high" | "critical";

export interface AccountGroupAssertions {
    existence: boolean;
    completeness: boolean;
    valuation: boolean;
    disclosure: boolean;
}

export interface AccountGroupObjective {
    id: string;
    title: string;
    description?: string;
}

export interface AccountRange {
    id: string;
    fromAccount: string;
    toAccount: string;
    description?: string;
}

export interface AccountGroupRisk {
    id: string;
    name: string;
    description?: string;
    source?: string;
}

export interface AccountGroupNode extends AuditFields {
    id: string;
    code: string;
    title: string;
    parentId: string | null;
    status: AccountGroupStatus;
    sortOrder?: number;
    description?: string;

    importance?: AccountGroupImportance;
    reasonableAssurance?: boolean;
    effectiveDate?: string;
    documentsCount?: number;

    assertions?: AccountGroupAssertions;
    objectives?: AccountGroupObjective[];
    accountRanges?: AccountRange[];
    risks?: AccountGroupRisk[];
}

export type AccountGroupReadonlyKeys =
    | "id"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export type AccountGroupNodeCreate = Omit<AccountGroupNode, AccountGroupReadonlyKeys>;

export type AccountGroupNodeUpdate = Partial<
    Omit<AccountGroupNode, AccountGroupReadonlyKeys>
>;
