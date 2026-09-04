import type { CentralControlObjectiveSummary } from "@/features/control-objective";

export type ControlObjectiveScopeStatus = "ACTIVE" | "INACTIVE";
export type ControlObjectiveScopeStatusFilter = ControlObjectiveScopeStatus | "ALL";
export type ControlObjectiveScopeEditState = "FINAL" | "DRAFT_NEW" | "DRAFT_EDITED" | "DRAFT_PENDING_DELETE";

export interface CentralSubprocessControlObjectiveScope {
  id: string;
  subprocessId: string;
  subprocessCode: string;
  subprocessTitle: string;
  controlObjectiveId: string;
  controlObjectiveCode: string;
  controlObjectiveTitle: string;
  objectiveClass: string | null;
  status: ControlObjectiveScopeStatus;
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

export interface ControlObjectiveScopeSelectionOptions {
  controlObjectives: CentralControlObjectiveSummary[];
}

export interface ControlObjectiveScopeDraftValues {
  validFrom: string | null;
  validTo: string | null;
}

export interface ControlObjectiveScopeDraftRow extends ControlObjectiveScopeDraftValues {
  key: string;
  scopeId: string | null;
  controlObjectiveId: string;
  controlObjectiveCode: string;
  controlObjectiveTitle: string;
  objectiveClass: string | null;
  status: ControlObjectiveScopeStatus;
  version: number | null;
  editState: ControlObjectiveScopeEditState;
  original: CentralSubprocessControlObjectiveScope | null;
}

export type ControlObjectiveScopeChangeOperation = "CREATE_OR_RESTORE" | "UPDATE" | "ACTIVATE" | "INACTIVATE" | "DELETE";

export interface ControlObjectiveScopeChange {
  operation: ControlObjectiveScopeChangeOperation;
  controlObjectiveId: string;
  scopeId?: string | null;
  version?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  requestedStatus?: ControlObjectiveScopeStatus | null;
}

export interface ControlObjectiveScopeDraftState {
  changes: ControlObjectiveScopeChange[];
  dirty: boolean;
  ready: boolean;
  invalid: boolean;
}

export const EMPTY_CONTROL_OBJECTIVE_SCOPE_DRAFT_STATE: ControlObjectiveScopeDraftState = {
  changes: [],
  dirty: false,
  ready: true,
  invalid: false,
};

export interface ControlObjectiveScopePermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  lifecycle: boolean;
  delete: boolean;
  restore: boolean;
  controlObjectiveView: boolean;
}
