import type { DocumentAggregateRequest } from "@/features/document";

export type CentralRiskStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type CentralRiskEditableStatus = Exclude<CentralRiskStatus, "DELETED">;
export type CentralRiskType = "COMPANY" | "OPERATION";
export type CentralRiskNodeKind = "category" | "template";
export type CentralRiskCreateKind = CentralRiskNodeKind;

export interface CentralRiskCategorySummary {
  id: string;
  code: string;
  title: string;
  parentCategoryId: string | null;
  sortOrder: number;
  status: CentralRiskStatus;
  version: number;
}

export interface CentralRiskCategoryDetail extends CentralRiskCategorySummary {
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface CentralRiskTemplateSummary {
  id: string;
  code: string;
  title: string;
  riskCategoryId: string;
  riskType: CentralRiskType;
  sortOrder: number;
  status: CentralRiskStatus;
  version: number;
}

export interface CentralRiskTemplateDetail extends CentralRiskTemplateSummary {
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface CreateCentralRiskCategoryCommand {
  code: string;
  title: string;
  parentCategoryId: string | null;
  description: string | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface UpdateCentralRiskCategoryCommand {
  version: number;
  title: string;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface EditCentralRiskCategoryCommand extends UpdateCentralRiskCategoryCommand {
  parentCategoryId: string | null;
  sortOrder: number;
  status: CentralRiskEditableStatus;
}

export interface MoveCentralRiskCategoryCommand {
  version: number;
  parentCategoryId: string | null;
  sortOrder: number;
}

export interface CreateCentralRiskTemplateCommand {
  code: string;
  title: string;
  riskCategoryId: string;
  riskType: CentralRiskType;
  description: string | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface UpdateCentralRiskTemplateCommand {
  version: number;
  title: string;
  riskType: CentralRiskType;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}

export interface EditCentralRiskTemplateCommand extends UpdateCentralRiskTemplateCommand {
  riskCategoryId: string;
  sortOrder: number;
  status: CentralRiskEditableStatus;
}

export interface MoveCentralRiskTemplateCommand {
  version: number;
  riskCategoryId: string;
  sortOrder: number;
}

export interface CentralRiskMutationResponse {
  entityId: string;
  revisionId: string;
  version: number;
  finalizedDocuments: unknown[];
}

export interface CentralRiskRevisionResponse {
  entityId: string;
  revisionId: string;
  version: number;
}
