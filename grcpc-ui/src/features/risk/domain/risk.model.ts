import type { AuditFields } from "@/shared/domain/audit.model";

export type RiskStatus = "active" | "inactive";

export type RiskNodeType = "riskCategory" | "riskTemplate";

export type RiskTemplateType =
    | "operational"
    | "financial"
    | "strategic"
    | "compliance"
    | "technology"
    | "reputation"
    | "safety"
    | "other";

export interface RiskEffect {
    id: string;
    effect: string;
    effectCategory: string;
    effectCategoryDescription?: string;
}

export interface RiskNode extends AuditFields {
    id: string;
    code: string;
    title: string;
    nodeType: RiskNodeType;
    parentId: string | null;
    status: RiskStatus;
    sortOrder?: number;
    description?: string;

    validFrom?: string;
    validTo?: string;
    allowReference?: boolean;
    analysisProfile?: string;
    ownerId?: string | null;
    ownerName?: string;
    documentsCount?: number;

    companyOperation?: string;
    riskType?: RiskTemplateType;
    causes?: string;
    effects?: RiskEffect[];
    existingRisksCount?: number;
    responsePatternsCount?: number;
    controlCentersCount?: number;
}

export type RiskReadonlyKeys =
    | "id"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export type RiskNodeCreate = Omit<RiskNode, RiskReadonlyKeys>;

export type RiskNodeUpdate = Partial<Omit<RiskNode, RiskReadonlyKeys>>;
