import type { DocumentAggregateRequest } from "@/features/document";

export type CentralAccountGroupStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type CentralAccountGroupEditableStatus = Exclude<CentralAccountGroupStatus, "DELETED">;
export type CentralAccountGroupImportance = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const CENTRAL_ACCOUNT_GROUP_IMPORTANCE: CentralAccountGroupImportance[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

export interface CentralAccountGroupSummary {
  id: string;
  code: string;
  title: string;
  parentAccountGroupId: string | null;
  importance: CentralAccountGroupImportance;
  reasonableAssurance: boolean;
  sortOrder: number;
  status: CentralAccountGroupStatus;
  validFrom?: string | null;
  validTo?: string | null;
  version: number;
}

export interface CentralAccountGroupDetail extends CentralAccountGroupSummary {
  description?: string | null;
  createdAt: string;
  createdBy?: string | null;
  updatedAt: string;
  updatedBy?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface CreateCentralAccountGroupCommand {
  code: string;
  title: string;
  parentAccountGroupId: string | null;
  importance: CentralAccountGroupImportance;
  reasonableAssurance: boolean;
  description: string | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface UpdateCentralAccountGroupCommand {
  version: number;
  title: string;
  importance: CentralAccountGroupImportance;
  reasonableAssurance: boolean;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface EditCentralAccountGroupCommand extends UpdateCentralAccountGroupCommand {
  parentAccountGroupId: string | null;
  sortOrder: number;
  status: CentralAccountGroupEditableStatus;
}

export interface MoveCentralAccountGroupCommand {
  version: number;
  parentAccountGroupId: string | null;
  sortOrder: number;
}

export interface CentralAccountGroupMutationResponse {
  entityId: string;
  revisionId: string;
  version: number;
  finalizedDocuments: unknown[];
}

export interface CentralAccountGroupRevisionResponse {
  entityId: string;
  revisionId: string;
  version: number;
}
