export type RegulationId = string;

export type RegulationStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface RegulationEntity {
    id: RegulationId;
    code: string; // مثل REG-001
    title: string;
    description?: string;

    parentId?: RegulationId | null;

    status: RegulationStatus;

    createdAt: string; // ISO
    updatedAt: string; // ISO
}

export interface RegulationUpsertInput {
    code: string;
    title: string;
    description?: string;
    parentId?: RegulationId | null;
    status: RegulationStatus;
}

export interface RegulationTreeNode {
    id: RegulationId;
    label: string;
    code: string;
    parentId?: RegulationId | null;
    entity: RegulationEntity;
    children: RegulationTreeNode[];
}