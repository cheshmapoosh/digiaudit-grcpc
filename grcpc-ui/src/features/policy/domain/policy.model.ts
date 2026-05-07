import type { AuditFields } from "@/shared/domain/audit.model";

export type PolicyStatus =
    | "draft"
    | "underReview"
    | "pendingApproval"
    | "approved"
    | "inactive";

export type PolicyNodeType = "policyGroup" | "policy";

export type PolicyCategory =
    | "hr"
    | "accounting"
    | "purchase"
    | "it"
    | "finance"
    | "compliance"
    | "other";

export type PolicyKind = "policy" | "procedure" | "announcement" | "workInstruction";

export type PolicyCommunicationMethod = "announcement" | "questionnaire" | "survey";

export interface PolicyNode extends AuditFields {
    id: string;
    code: string;
    title: string;
    nodeType: PolicyNodeType;
    parentId: string | null;
    status: PolicyStatus;
    sortOrder?: number;
    description?: string;

    policyCategory?: PolicyCategory;
    policyKind?: PolicyKind;
    ownerId?: string | null;
    ownerName?: string;
    ownerOrganization?: string;
    creatorName?: string;
    documentsCount?: number;

    version?: string;
    validFrom?: string;
    validTo?: string;
    nextReviewDate?: string;
    communicationMethod?: PolicyCommunicationMethod;
    communicationLanguage?: string;
    objective?: string;
    note?: string;
    evaluationConfirmed?: boolean;
}

export type PolicyReadonlyKeys =
    | "id"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export type PolicyNodeCreate = Omit<PolicyNode, PolicyReadonlyKeys>;

export type PolicyNodeUpdate = Partial<Omit<PolicyNode, PolicyReadonlyKeys>>;
