export type ControlObjectiveClassificationStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type ControlObjectiveClassificationEditableStatus = Exclude<ControlObjectiveClassificationStatus, "DELETED">;
export type ControlObjectiveClassificationEditState =
  | "FINAL"
  | "DRAFT_NEW"
  | "DRAFT_EDITED"
  | "DRAFT_DELETE"
  | "DRAFT_RESTORE";

export interface ControlObjectiveAccountGroupClassification {
  classificationId: string;
  controlObjectiveId: string;
  controlObjectiveCode: string;
  controlObjectiveTitle: string;
  accountGroupId: string;
  accountGroupCode: string;
  accountGroupTitle: string;
  parentAccountGroupId: string | null;
  accountGroupStatus: ControlObjectiveClassificationStatus;
  status: ControlObjectiveClassificationStatus;
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

export interface ControlObjectiveAccountGroupOption {
  id: string;
  code: string;
  title: string;
  parentAccountGroupId: string | null;
  sortOrder: number;
  status: ControlObjectiveClassificationEditableStatus;
  children: ControlObjectiveAccountGroupOption[];
}

export interface ControlObjectiveAccountGroupOptions {
  accountGroups: ControlObjectiveAccountGroupOption[];
}

export type ControlObjectiveClassificationChangeOperation =
  | "CREATE_OR_RESTORE"
  | "UPDATE"
  | "ACTIVATE"
  | "INACTIVATE"
  | "DELETE"
  | "RESTORE";

export interface ControlObjectiveAccountGroupChange {
  operation: ControlObjectiveClassificationChangeOperation;
  accountGroupId: string;
  classificationId?: string | null;
  version?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  requestedStatus?: ControlObjectiveClassificationEditableStatus | null;
}

export interface ControlObjectiveClassificationDraftRow {
  key: string;
  classificationId: string | null;
  accountGroupId: string;
  accountGroupCode: string;
  accountGroupTitle: string;
  parentAccountGroupId: string | null;
  accountGroupStatus: ControlObjectiveClassificationStatus;
  status: ControlObjectiveClassificationEditableStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number | null;
  editState: ControlObjectiveClassificationEditState;
  original: ControlObjectiveAccountGroupClassification | null;
}

export interface ControlObjectiveClassificationDraftState {
  changes: ControlObjectiveAccountGroupChange[];
  dirty: boolean;
  ready: boolean;
  invalid: boolean;
}

export const EMPTY_CONTROL_OBJECTIVE_CLASSIFICATION_DRAFT_STATE:
ControlObjectiveClassificationDraftState = {
  changes: [],
  dirty: false,
  ready: true,
  invalid: false,
};

export interface ControlObjectiveAccountGroupPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  lifecycle: boolean;
  delete: boolean;
  restore: boolean;
}
