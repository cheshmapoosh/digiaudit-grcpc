import type { AuditFields } from "@/shared/domain/audit.model";

export type ProcessStatus = "active" | "inactive";

export type ProcessNodeType = "process" | "subProcess" | "control";

export type ProcessCategory =
    | "operational"
    | "support"
    | "strategic"
    | "financial"
    | "compliance"
    | "it"
    | "other";

export type ControlImportance = "low" | "medium" | "high" | "critical";

export type ControlAutomation = "manual" | "automated" | "semiAutomated";

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

    controlAutomation?: ControlAutomation;
    controlFrequency?: string;
    controlClassification?: string;
    controlOwner?: string;
    testDirection?: string;
    testType?: string;
    testProgram?: string;
    importance?: ControlImportance;
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
