export type AssignmentStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type AssignmentEditableStatus = Exclude<AssignmentStatus, "DELETED">;
export type AssignmentEditState = "FINAL" | "DRAFT_NEW" | "DRAFT_EDITED" | "DRAFT_DELETE" | "DRAFT_RESTORED";

export interface ControlControlObjectiveAssignment {
  assignmentId: string;
  controlId: string; controlCode: string; controlTitle: string; controlStatus: AssignmentStatus; controlValidFrom: string | null; controlValidTo: string | null;
  controlObjectiveId: string; controlObjectiveCode: string; controlObjectiveTitle: string; controlObjectiveStatus: AssignmentStatus; controlObjectiveValidFrom: string | null; controlObjectiveValidTo: string | null;
  status: AssignmentStatus; validFrom: string | null; validTo: string | null; version: number;
  createdAt: string; createdBy: string; updatedAt: string; updatedBy: string; deletedAt: string | null; deletedBy: string | null;
}
export interface ControlObjectiveOption { id: string; code: string; title: string; status: AssignmentEditableStatus; validFrom: string | null; validTo: string | null; }
export interface ControlControlObjectiveAssignmentOptions { controlObjectives: ControlObjectiveOption[]; }
export type AssignmentChangeOperation = "CREATE_OR_RESTORE" | "UPDATE" | "ACTIVATE" | "INACTIVATE" | "DELETE" | "RESTORE";
export interface ControlControlObjectiveAssignmentChange { operation: AssignmentChangeOperation; controlObjectiveId: string; assignmentId?: string | null; version?: number | null; validFrom?: string | null; validTo?: string | null; requestedStatus?: AssignmentEditableStatus | null; }
export interface AssignmentDraftRow { key: string; assignmentId: string | null; controlObjectiveId: string; controlObjectiveCode: string; controlObjectiveTitle: string; controlObjectiveStatus: AssignmentStatus; controlObjectiveValidFrom: string | null; controlObjectiveValidTo: string | null; status: AssignmentStatus; validFrom: string | null; validTo: string | null; version: number | null; editState: AssignmentEditState; original: ControlControlObjectiveAssignment | null; }
export interface AssignmentDraftState { changes: ControlControlObjectiveAssignmentChange[]; dirty: boolean; ready: boolean; invalid: boolean; }
export const EMPTY_ASSIGNMENT_DRAFT_STATE: AssignmentDraftState = { changes: [], dirty: false, ready: true, invalid: false };
export interface ControlControlObjectiveAssignmentPermissions { view: boolean; create: boolean; update: boolean; lifecycle: boolean; delete: boolean; restore: boolean; }
