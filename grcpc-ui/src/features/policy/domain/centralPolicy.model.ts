import type { DocumentAggregateRequest } from "@/features/document";
import type {
  DefinitionDetailFields,
  MutationResponse,
  RevisionMutationResponse,
} from "@/features/central-catalog/components/catalogPresentation.model";

export type CentralPolicyNodeType = "GROUP" | "POLICY";
export type CentralPolicyType =
  | "POLICY"
  | "PROCEDURE"
  | "ANNOUNCEMENT"
  | "WORK_INSTRUCTION";
export type CentralPolicyCommunicationMethod =
  | "ANNOUNCEMENT"
  | "QUESTIONNAIRE"
  | "SURVEY";
export type PolicyVersionStatus = "DRAFT" | "PUBLISHED" | "SUPERSEDED";

interface DefinitionAuditFields {
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface CentralPolicyGroupSummary extends DefinitionDetailFields {
  parentGroupId: string | null;
  sortOrder: number;
}

export interface CentralPolicyGroupDetail
  extends CentralPolicyGroupSummary,
    DefinitionAuditFields {
  description: string | null;
}

export interface CentralPolicySummary extends DefinitionDetailFields {
  policyGroupId: string;
  policyType: CentralPolicyType;
  sortOrder: number;
}

export interface CentralPolicyDetail
  extends CentralPolicySummary,
    DefinitionAuditFields {
  responsibleOrganization: string | null;
  communicationMethod: CentralPolicyCommunicationMethod | null;
  nextReviewDate: string | null;
  objective: string | null;
  description: string | null;
}

export interface CentralPolicyVersionDetail extends DefinitionDetailFields {
  policyId: string;
  versionNumber: number;
  content: string | null;
  versionStatus: PolicyVersionStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export type CentralPolicyAnyDetail = CentralPolicyGroupDetail | CentralPolicyDetail;

interface CreateBase {
  code: string;
  title: string;
  description: string | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

interface UpdateBase {
  version: number;
  title: string;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

interface PolicyMetadata {
  policyType: CentralPolicyType;
  responsibleOrganization: string | null;
  communicationMethod: CentralPolicyCommunicationMethod | null;
  nextReviewDate: string | null;
  objective: string | null;
}

export interface CreateCentralPolicyGroupCommand extends CreateBase {
  parentGroupId: string | null;
}

export type UpdateCentralPolicyGroupCommand = UpdateBase;

export interface MoveCentralPolicyGroupCommand {
  version: number;
  parentGroupId: string | null;
  sortOrder: number;
}

export interface CreateCentralPolicyCommand extends CreateBase, PolicyMetadata {
  policyGroupId: string;
}

export interface UpdateCentralPolicyCommand extends UpdateBase, PolicyMetadata {}

export interface MoveCentralPolicyCommand {
  version: number;
  policyGroupId: string;
  sortOrder: number;
}

export interface CreateCentralPolicyVersionCommand {
  content: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface UpdateCentralPolicyVersionCommand
  extends CreateCentralPolicyVersionCommand {
  version: number;
}

export type CentralPolicyMutationResponse = MutationResponse;
export type CentralPolicyRevisionResponse = RevisionMutationResponse;
