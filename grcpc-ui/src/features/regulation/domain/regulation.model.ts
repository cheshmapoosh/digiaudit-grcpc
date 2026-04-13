import type { AuditFields } from "@/shared/domain/audit.model";

export type RegulationStatus = "active" | "inactive";

export type RegulationType =
    | "law"
    | "regulation"
    | "directive"
    | "circular"
    | "procedure"
    | "instruction"
    | "policy"
    | "other";

export interface RegulationNode extends AuditFields {
    id: string;
    code: string;
    name: string;
    type: RegulationType;
    parentId: string | null;
    status: RegulationStatus;
    validFrom?: string;
    validTo?: string;
    description?: string;
}

export type RegulationReadonlyKeys =
    | "id"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export type RegulationNodeCreate = Omit<
    RegulationNode,
    RegulationReadonlyKeys
>;

export type RegulationNodeUpdate = Partial<
    Omit<RegulationNode, RegulationReadonlyKeys>
>;
