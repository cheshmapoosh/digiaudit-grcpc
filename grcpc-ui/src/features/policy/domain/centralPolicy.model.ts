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
  content: string | null;
  description: string | null;
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
  content: string | null;
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
  status: "ACTIVE" | "INACTIVE";
  subprocessScopeChanges: PolicySubprocessScopeChange[];
  organizationScopeChanges: PolicyOrganizationScopeChange[];
  controlScopeChanges: PolicyControlScopeChange[];
  requirementScopeChanges: PolicyRequirementScopeChange[];
}

export interface UpdateCentralPolicyCommand extends UpdateBase, PolicyMetadata {
  policyGroupId: string;
  sortOrder: number;
  status: "ACTIVE" | "INACTIVE";
  subprocessScopeChanges: PolicySubprocessScopeChange[];
  organizationScopeChanges: PolicyOrganizationScopeChange[];
  controlScopeChanges: PolicyControlScopeChange[];
  requirementScopeChanges: PolicyRequirementScopeChange[];
}

export interface MoveCentralPolicyCommand {
  version: number;
  policyGroupId: string;
  sortOrder: number;
}

export type PolicyScopeOperation = "CREATE_OR_RESTORE" | "UPDATE" | "ACTIVATE" | "INACTIVATE" | "DELETE" | "RESTORE";
interface PolicyScopeChangeBase {
  operation: PolicyScopeOperation;
  relationId: string | null;
  version: number | null;
  validFrom: string | null;
  validTo: string | null;
  requestedStatus: "ACTIVE" | "INACTIVE" | null;
}
export interface PolicySubprocessScopeChange extends PolicyScopeChangeBase { subprocessId: string; }
export interface PolicyOrganizationScopeChange extends PolicyScopeChangeBase { organizationId: string; }
export interface PolicyControlScopeChange extends PolicyScopeChangeBase { centralControlScopeId: string; }
export interface PolicyRequirementScopeChange extends PolicyScopeChangeBase { centralRequirementScopeId: string; }

interface PolicyScopeRowBase {
  id: string;
  policyId: string;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  validFrom: string | null;
  validTo: string | null;
  version: number;
}
export interface PolicySubprocessScopeRow extends PolicyScopeRowBase {
  subprocessId: string; subprocessCode: string; subprocessTitle: string; processId: string;
  processCode: string; processTitle: string;
}
export interface PolicyOrganizationScopeRow extends PolicyScopeRowBase {
  organizationId: string; organizationCode: string; organizationTitle: string; parentOrganizationId: string | null;
  parentOrganizationCode: string | null; parentOrganizationTitle: string | null;
}
export interface PolicyControlScopeRow extends PolicyScopeRowBase {
  centralControlScopeId: string; subprocessId: string; subprocessCode: string; subprocessTitle: string;
  controlId: string; controlCode: string; controlTitle: string;
  controlGroupCode: string | null; controlGroupTitle: string | null;
}
export interface PolicyRequirementScopeRow extends PolicyScopeRowBase {
  centralRequirementScopeId: string; subprocessId: string; subprocessCode: string; subprocessTitle: string;
  requirementId: string; requirementCode: string; requirementTitle: string;
  regulationCode: string; regulationTitle: string;
}
export interface PolicySubprocessOption {
  subprocessId: string; code: string; title: string; processId: string; status: string;
  processCode: string; processTitle: string;
  validFrom: string | null; validTo: string | null;
}
export interface PolicyOrganizationOption {
  organizationId: string; code: string; title: string; parentOrganizationId: string | null; status: string;
  parentOrganizationCode: string | null; parentOrganizationTitle: string | null;
  validFrom: string | null; validTo: string | null;
}
export interface PolicyControlOption {
  centralControlScopeId: string; subprocessId: string; subprocessCode: string; subprocessTitle: string;
  controlId: string; controlCode: string; controlTitle: string;
  controlGroupCode: string | null; controlGroupTitle: string | null; status: string;
  validFrom: string | null; validTo: string | null;
}
export interface PolicyRequirementOption {
  centralRequirementScopeId: string; subprocessId: string; subprocessCode: string; subprocessTitle: string;
  requirementId: string; requirementCode: string; requirementTitle: string;
  regulationCode: string; regulationTitle: string; status: string;
  validFrom: string | null; validTo: string | null;
}
export interface CentralPolicyAggregateResponse extends MutationResponse {
  subprocessScopes: PolicySubprocessScopeRow[];
  organizationScopes: PolicyOrganizationScopeRow[];
  controlScopes: PolicyControlScopeRow[];
  requirementScopes: PolicyRequirementScopeRow[];
}
export type CentralPolicyMutationResponse = MutationResponse;
export type CentralPolicyRevisionResponse = RevisionMutationResponse;
