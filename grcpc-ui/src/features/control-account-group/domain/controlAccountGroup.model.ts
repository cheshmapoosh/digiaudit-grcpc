export type ClassificationStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type ClassificationEditableStatus = Exclude<ClassificationStatus, "DELETED">;
export type ClassificationEditState = "FINAL" | "DRAFT_NEW" | "DRAFT_EDITED" | "DRAFT_DELETE";

export interface ControlAccountGroupClassification {
  classificationId: string;
  controlId: string; controlCode: string; controlTitle: string;
  accountGroupId: string; accountGroupCode: string; accountGroupTitle: string;
  parentAccountGroupId: string | null; accountGroupStatus: ClassificationStatus;
  status: ClassificationStatus; validFrom: string | null; validTo: string | null; version: number;
  createdAt: string; createdBy: string; updatedAt: string; updatedBy: string;
  deletedAt: string | null; deletedBy: string | null;
}

export interface AccountGroupOption {
  id: string; code: string; title: string; parentAccountGroupId: string | null;
  sortOrder: number; status: ClassificationEditableStatus; children: AccountGroupOption[];
}
export interface ControlAccountGroupOptions { accountGroups: AccountGroupOption[]; }

export type ClassificationChangeOperation = "CREATE_OR_RESTORE" | "UPDATE" | "ACTIVATE" | "INACTIVATE" | "DELETE" | "RESTORE";
export interface ControlAccountGroupChange {
  operation: ClassificationChangeOperation; accountGroupId: string;
  classificationId?: string | null; version?: number | null;
  validFrom?: string | null; validTo?: string | null; requestedStatus?: ClassificationEditableStatus | null;
}

export interface ClassificationDraftRow {
  key: string; classificationId: string | null; accountGroupId: string; accountGroupCode: string;
  accountGroupTitle: string; parentAccountGroupId: string | null; accountGroupStatus: ClassificationStatus;
  status: ClassificationEditableStatus; validFrom: string | null; validTo: string | null;
  version: number | null; editState: ClassificationEditState; original: ControlAccountGroupClassification | null;
}
export interface ClassificationDraftState { changes: ControlAccountGroupChange[]; dirty: boolean; ready: boolean; invalid: boolean; }
export const EMPTY_CLASSIFICATION_DRAFT_STATE: ClassificationDraftState = { changes: [], dirty: false, ready: true, invalid: false };
export interface ControlAccountGroupPermissions { view: boolean; create: boolean; update: boolean; lifecycle: boolean; delete: boolean; restore: boolean; }

export interface DerivedSubprocessAccountGroup {
  accountGroupId: string; accountGroupCode: string; accountGroupTitle: string;
  parentAccountGroupId: string | null; accountGroupStatus: ClassificationStatus;
  contributingControls: Array<{ controlId: string; controlCode: string; controlTitle: string;
    controlScopeId: string; controlScopeStatus: ClassificationEditableStatus;
    classificationId: string; classificationStatus: ClassificationEditableStatus }>;
  contributingControlObjectives: Array<{
    controlObjectiveId: string; controlObjectiveCode: string; controlObjectiveTitle: string;
    objectiveClass: string | null;
    controlObjectiveScopeId: string; controlObjectiveScopeStatus: ClassificationEditableStatus;
    classificationId: string; classificationStatus: ClassificationEditableStatus }>; 
}
