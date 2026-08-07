import type { DocumentAggregateRequest } from "@/features/document";
import type {
  DefinitionDetailFields,
  MutationResponse,
  RevisionMutationResponse,
} from "@/features/central-catalog/components/catalogPresentation.model";
export interface CentralPolicyGroupSummary extends DefinitionDetailFields {
  parentGroupId: string | null;
  sortOrder: number;
}
export type CentralPolicyGroupDetail = CentralPolicyGroupSummary;
export interface CentralPolicySummary extends DefinitionDetailFields {
  policyGroupId: string;
  sortOrder: number;
}
export type CentralPolicyDetail = CentralPolicySummary;
export type PolicyVersionStatus = "DRAFT" | "PUBLISHED" | "SUPERSEDED";
export interface CentralPolicyVersionDetail extends DefinitionDetailFields {
  policyId: string;
  versionNumber: number;
  content: string | null;
  versionStatus: PolicyVersionStatus;
  publishedAt: string | null;
  publishedBy: string | null;
}
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
export interface CreateCentralPolicyGroupCommand extends CreateBase {
  parentGroupId: string | null;
}
export type UpdateCentralPolicyGroupCommand = UpdateBase;
export interface MoveCentralPolicyGroupCommand {
  version: number;
  parentGroupId: string | null;
  sortOrder: number;
}
export interface CreateCentralPolicyCommand extends CreateBase {
  policyGroupId: string;
}
export type UpdateCentralPolicyCommand = UpdateBase;
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
