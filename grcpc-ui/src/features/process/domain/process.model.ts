import type { AuditFields } from "@/shared/domain/audit.model";

export type ProcessStatus = "active" | "inactive";

export type ProcessNodeType = "process" | "subProcess";

export type ProcessCategory =
    | "operational"
    | "support"
    | "strategic"
    | "financial"
    | "compliance"
    | "it"
    | "other";

export interface ProcessNode extends AuditFields {
    id: string;
    code: string;
    title: string;
    nodeType: ProcessNodeType;
    parentId: string | null;
    status: ProcessStatus;
    sortOrder?: number;
    description?: string;

    processCategory?: ProcessCategory;
    ownerId?: string | null;
    ownerName?: string;
    documentsCount?: number;

    objective?: string;
    operationCycle?: string;
}

export type ProcessReadonlyKeys =
    | "id"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export type ProcessNodeCreate = Omit<ProcessNode, ProcessReadonlyKeys>;

export type ProcessNodeUpdate = Partial<Omit<ProcessNode, ProcessReadonlyKeys>>;
