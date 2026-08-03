import type { AuditFields } from "@/shared/domain/audit.model";

export type ProcessStatus = "ACTIVE" | "INACTIVE" | "DELETED";

export type ProcessNodeType = "PROCESS" | "SUBPROCESS";

export interface MasterDataRevisionMutationResponse {
    entityId: string;
    revisionId: string;
    version: number;
}

export interface ProcessNode extends AuditFields {
    id: string;
    code: string;
    title: string;
    nodeType: ProcessNodeType;
    parentId: string | null;
    description?: string | null;
    sortOrder: number;
    status: ProcessStatus;
    validFrom?: string | null;
    validTo?: string | null;
    version: number;
}

export type ProcessReadonlyKeys =
    | "id"
    | "nodeType"
    | "status"
    | "version"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export interface ProcessNodeCreate {
    nodeType: ProcessNodeType;
    code: string;
    title: string;
    parentId?: string | null;
    description?: string | null;
    sortOrder?: number | null;
    validFrom?: string | null;
    validTo?: string | null;
}

export interface ProcessNodeUpdate {
    version: number;
    title: string;
    description?: string | null;
    sortOrder?: number | null;
    validFrom?: string | null;
    validTo?: string | null;
}

export interface ProcessMoveCommand {
    parentId?: string | null;
    version: number;
}

export interface ProcessLifecycleCommand {
    version: number;
}

export interface CentralProcessResponse extends AuditFields {
    id: string;
    code: string;
    title: string;
    parentProcessId: string | null;
    description?: string | null;
    sortOrder: number;
    status: ProcessStatus;
    validFrom?: string | null;
    validTo?: string | null;
    version: number;
}

export interface CentralSubprocessResponse extends AuditFields {
    id: string;
    code: string;
    title: string;
    processId: string;
    description?: string | null;
    sortOrder: number;
    status: ProcessStatus;
    validFrom?: string | null;
    validTo?: string | null;
    version: number;
}
