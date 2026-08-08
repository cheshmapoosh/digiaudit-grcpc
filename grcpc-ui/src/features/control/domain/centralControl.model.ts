import type { DocumentAggregateRequest } from "@/features/document";

export type CentralControlStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type CentralControlEditableStatus = Exclude<CentralControlStatus, "DELETED">;
export type CentralControlClass = "ACTIVITY_LEVEL" | "ENTITY_LEVEL";
export type CentralControlImportance = "PRIMARY" | "SECONDARY";
export type CentralControlAutomationType = "MANUAL" | "SYSTEM" | "SEMI_AUTOMATED";
export type CentralControlPurpose = "PREVENTIVE" | "DETECTIVE";

export interface CentralControlSummary {
  id: string;
  code: string;
  title: string;
  status: CentralControlStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number;
}

export interface CentralControlDetail extends CentralControlSummary {
  description: string | null;
  controlClass: CentralControlClass | null;
  importance: CentralControlImportance | null;
  automationType: CentralControlAutomationType | null;
  controlPurpose: CentralControlPurpose | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface CreateCentralControlCommand {
  code: string;
  title: string;
  description: string | null;
  controlClass: CentralControlClass | null;
  importance: CentralControlImportance | null;
  automationType: CentralControlAutomationType | null;
  controlPurpose: CentralControlPurpose | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface UpdateCentralControlCommand {
  version: number;
  title: string;
  description: string | null;
  controlClass: CentralControlClass | null;
  importance: CentralControlImportance | null;
  automationType: CentralControlAutomationType | null;
  controlPurpose: CentralControlPurpose | null;
  status: CentralControlEditableStatus;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface CentralControlMutationResponse {
  entityId: string;
  revisionId: string;
  version: number;
  finalizedDocuments: unknown[];
}

export interface CentralControlRevisionResponse {
  entityId: string;
  revisionId: string;
  version: number;
}
