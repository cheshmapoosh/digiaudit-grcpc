export type ControlScopeStatus = "ACTIVE" | "INACTIVE";
export type ControlScopeStatusFilter = ControlScopeStatus | "ALL";
export type ControlScopeEditState = "FINAL" | "DRAFT_NEW" | "DRAFT_EDITED" | "DRAFT_PENDING_DELETE";

export interface CentralSubprocessControlScope {
  id: string;
  subprocessId: string;
  subprocessCode: string;
  subprocessTitle: string;
  controlId: string;
  controlCode: string;
  controlTitle: string;
  recommendedFrequencyCode: string | null;
  recommendedExecutionMethodCode: string | null;
  recommendedTestMethodCode: string | null;
  status: ControlScopeStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: null;
  deletedBy: null;
}

export interface ControlScopeOptions {
  recommendedFrequencyCodes: string[];
  recommendedExecutionMethodCodes: string[];
  recommendedTestMethodCodes: string[];
}

export interface ControlScopeDraftValues {
  recommendedFrequencyCode: string | null;
  recommendedExecutionMethodCode: string | null;
  recommendedTestMethodCode: string | null;
  validFrom: string | null;
  validTo: string | null;
}

export interface ControlScopeDraftRow extends ControlScopeDraftValues {
  key: string;
  scopeId: string | null;
  controlId: string;
  controlCode: string;
  controlTitle: string;
  status: ControlScopeStatus;
  version: number | null;
  editState: ControlScopeEditState;
  original: CentralSubprocessControlScope | null;
}

export type ControlScopeChangeOperation = "CREATE_OR_RESTORE" | "UPDATE" | "ACTIVATE" | "INACTIVATE" | "DELETE";

export interface ControlScopeChange {
  operation: ControlScopeChangeOperation;
  controlId: string;
  scopeId?: string | null;
  version?: number | null;
  recommendedFrequencyCode?: string | null;
  recommendedExecutionMethodCode?: string | null;
  recommendedTestMethodCode?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  requestedStatus?: ControlScopeStatus | null;
}

export interface ControlScopeDraftState {
  changes: ControlScopeChange[];
  dirty: boolean;
  ready: boolean;
  invalid: boolean;
}

export const EMPTY_CONTROL_SCOPE_DRAFT_STATE: ControlScopeDraftState = {
  changes: [], dirty: false, ready: true, invalid: false,
};

export interface ControlScopePermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  lifecycle: boolean;
  delete: boolean;
  restore: boolean;
}
