export type AssignmentStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type AssignmentEditableStatus = Exclude<AssignmentStatus, "DELETED">;
export type AssignmentEditState = "FINAL" | "DRAFT_NEW" | "DRAFT_EDITED" | "DRAFT_DELETE" | "DRAFT_RESTORED";

export interface RiskControlAssignment {
  assignmentId: string;
  controlId: string; controlCode: string; controlTitle: string; controlStatus: AssignmentStatus; controlValidFrom: string | null; controlValidTo: string | null;
  riskTemplateId: string; riskTemplateCode: string; riskTemplateTitle: string; riskTemplateStatus: AssignmentStatus; riskTemplateValidFrom: string | null; riskTemplateValidTo: string | null;
  status: AssignmentStatus; validFrom: string | null; validTo: string | null; version: number;
  createdAt: string; createdBy: string; updatedAt: string; updatedBy: string; deletedAt: string | null; deletedBy: string | null;
}
export interface RiskTemplateOption { id: string; code: string; title: string; status: AssignmentEditableStatus; validFrom: string | null; validTo: string | null; }
export interface RiskControlAssignmentOptions { riskTemplates: RiskTemplateOption[]; }
export type AssignmentChangeOperation = "CREATE_OR_RESTORE" | "UPDATE" | "ACTIVATE" | "INACTIVATE" | "DELETE" | "RESTORE";
export interface RiskControlAssignmentChange { operation: AssignmentChangeOperation; riskTemplateId: string; assignmentId?: string | null; version?: number | null; validFrom?: string | null; validTo?: string | null; requestedStatus?: AssignmentEditableStatus | null; }
export interface AssignmentDraftRow { key: string; assignmentId: string | null; riskTemplateId: string; riskTemplateCode: string; riskTemplateTitle: string; riskTemplateStatus: AssignmentStatus; riskTemplateValidFrom: string | null; riskTemplateValidTo: string | null; status: AssignmentStatus; validFrom: string | null; validTo: string | null; version: number | null; editState: AssignmentEditState; original: RiskControlAssignment | null; }
export interface AssignmentDraftState { changes: RiskControlAssignmentChange[]; dirty: boolean; ready: boolean; invalid: boolean; }
export const EMPTY_ASSIGNMENT_DRAFT_STATE: AssignmentDraftState = { changes: [], dirty: false, ready: true, invalid: false };
export interface RiskControlAssignmentPermissions { view: boolean; create: boolean; update: boolean; lifecycle: boolean; delete: boolean; restore: boolean; }
