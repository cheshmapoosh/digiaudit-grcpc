export type AssignmentStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type AssignmentEditableStatus = Exclude<AssignmentStatus, "DELETED">;
export type AssignmentEditState = "FINAL" | "DRAFT_NEW" | "DRAFT_EDITED" | "DRAFT_DELETE" | "DRAFT_RESTORED";

export interface RequirementControlAssignment {
  assignmentId: string;
  controlId: string; controlCode: string; controlTitle: string; controlStatus: AssignmentStatus; controlValidFrom: string | null; controlValidTo: string | null;
  requirementId: string; requirementCode: string; requirementTitle: string; requirementStatus: AssignmentStatus; requirementValidFrom: string | null; requirementValidTo: string | null;
  status: AssignmentStatus; validFrom: string | null; validTo: string | null; version: number;
  createdAt: string; createdBy: string; updatedAt: string; updatedBy: string; deletedAt: string | null; deletedBy: string | null;
}
export interface RequirementOption { id: string; code: string; title: string; status: AssignmentEditableStatus; validFrom: string | null; validTo: string | null; }
export interface RequirementControlAssignmentOptions { requirements: RequirementOption[]; }
export type AssignmentChangeOperation = "CREATE_OR_RESTORE" | "UPDATE" | "ACTIVATE" | "INACTIVATE" | "DELETE" | "RESTORE";
export interface RequirementControlAssignmentChange { operation: AssignmentChangeOperation; requirementId: string; assignmentId?: string | null; version?: number | null; validFrom?: string | null; validTo?: string | null; requestedStatus?: AssignmentEditableStatus | null; }
export interface AssignmentDraftRow { key: string; assignmentId: string | null; requirementId: string; requirementCode: string; requirementTitle: string; requirementStatus: AssignmentStatus; requirementValidFrom: string | null; requirementValidTo: string | null; status: AssignmentStatus; validFrom: string | null; validTo: string | null; version: number | null; editState: AssignmentEditState; original: RequirementControlAssignment | null; }
export interface AssignmentDraftState { changes: RequirementControlAssignmentChange[]; dirty: boolean; ready: boolean; invalid: boolean; }
export const EMPTY_ASSIGNMENT_DRAFT_STATE: AssignmentDraftState = { changes: [], dirty: false, ready: true, invalid: false };
export interface RequirementControlAssignmentPermissions { view: boolean; create: boolean; update: boolean; lifecycle: boolean; delete: boolean; restore: boolean; }
