import type {
  CentralRegulationGroupSummary,
  CentralRegulationRequirementSummary,
  CentralRegulationSummary,
} from "@/features/regulation/domain/centralRegulation.model";

export type RequirementScopeStatus = "ACTIVE" | "INACTIVE";
export type RequirementScopeStatusFilter = RequirementScopeStatus | "ALL";
export type RequirementScopeEditState = "FINAL" | "DRAFT_NEW" | "DRAFT_EDITED" | "DRAFT_PENDING_DELETE";

export interface CentralSubprocessRequirementScope {
  id: string;
  subprocessId: string;
  subprocessCode: string;
  subprocessTitle: string;
  requirementId: string;
  requirementCode: string;
  requirementTitle: string;
  regulationId: string;
  status: RequirementScopeStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface RequirementScopeSelectionOptions {
  regulationGroups: CentralRegulationGroupSummary[];
  regulations: CentralRegulationSummary[];
  requirements: CentralRegulationRequirementSummary[];
}

export interface RequirementScopeDraftValues {
  validFrom: string | null;
  validTo: string | null;
}

export interface RequirementScopeDraftRow extends RequirementScopeDraftValues {
  key: string;
  scopeId: string | null;
  requirementId: string;
  requirementCode: string;
  requirementTitle: string;
  regulationId: string;
  status: RequirementScopeStatus;
  version: number | null;
  editState: RequirementScopeEditState;
  original: CentralSubprocessRequirementScope | null;
}

export type RequirementScopeChangeOperation = "CREATE_OR_RESTORE" | "UPDATE" | "ACTIVATE" | "INACTIVATE" | "DELETE";

export interface RequirementScopeChange {
  operation: RequirementScopeChangeOperation;
  requirementId: string;
  scopeId?: string | null;
  version?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  requestedStatus?: RequirementScopeStatus | null;
}

export interface RequirementScopeDraftState {
  changes: RequirementScopeChange[];
  dirty: boolean;
  ready: boolean;
  invalid: boolean;
}

export const EMPTY_REQUIREMENT_SCOPE_DRAFT_STATE: RequirementScopeDraftState = {
  changes: [],
  dirty: false,
  ready: true,
  invalid: false,
};

export interface RequirementScopePermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  lifecycle: boolean;
  delete: boolean;
  restore: boolean;
  requirementView: boolean;
}
