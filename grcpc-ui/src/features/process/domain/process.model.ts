import type { AuditFields } from "@/shared/domain/audit.model";
import type { DocumentAggregateRequest, DocumentCommandResponse } from "@/features/document";
import type { CentralSubprocessControlScope, ControlScopeChange } from "@/features/control-scope";
import type { CentralSubprocessRiskScope, RiskScopeChange } from "@/features/risk-scope";
import type { CentralSubprocessControlObjectiveScope, ControlObjectiveScopeChange } from "@/features/control-objective-scope";

export type ProcessStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type ProcessEditableStatus = "ACTIVE" | "INACTIVE";

export type ProcessNodeType = "PROCESS" | "SUBPROCESS";

export interface MasterDataRevisionMutationResponse {
    entityId: string;
    revisionId: string;
    version: number;
}

export interface MasterDataAggregateMutationResponse extends MasterDataRevisionMutationResponse {
    finalizedDocuments: DocumentCommandResponse[];
    controlScopes?: CentralSubprocessControlScope[];
    riskScopes?: CentralSubprocessRiskScope[];
    controlObjectiveScopes?: CentralSubprocessControlObjectiveScope[];
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
    documents: DocumentAggregateRequest;
    controlScopeChanges: ControlScopeChange[];
    riskScopeChanges: RiskScopeChange[];
    controlObjectiveScopeChanges: ControlObjectiveScopeChange[];
}

export interface ProcessNodeUpdate {
    version: number;
    title: string;
    status: ProcessEditableStatus;
    parentId?: string | null;
    description?: string | null;
    sortOrder?: number | null;
    validFrom?: string | null;
    validTo?: string | null;
    documents: DocumentAggregateRequest;
    controlScopeChanges: ControlScopeChange[];
    riskScopeChanges: RiskScopeChange[];
    controlObjectiveScopeChanges: ControlObjectiveScopeChange[];
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
