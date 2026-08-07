import type { DocumentAggregateRequest } from "@/features/document";
import type {
  DefinitionDetailFields,
  MutationResponse,
  RevisionMutationResponse,
} from "@/features/central-catalog/components/catalogPresentation.model";
export interface CentralRiskCategorySummary extends DefinitionDetailFields {
  parentCategoryId: string | null;
  sortOrder: number;
}
export type CentralRiskCategoryDetail = CentralRiskCategorySummary;
export interface CentralRiskTemplateSummary extends DefinitionDetailFields {
  riskCategoryId: string;
  sortOrder: number;
}
export type CentralRiskTemplateDetail = CentralRiskTemplateSummary;
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
export interface MoveCentralRiskCategoryCommand {
  version: number;
  parentCategoryId: string | null;
  sortOrder: number;
}
export interface CreateCentralRiskTemplateCommand {
  code: string;
  title: string;
  riskCategoryId: string;
  description: string | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}
export interface UpdateCentralRiskTemplateCommand {
  version: number;
  title: string;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}
export interface MoveCentralRiskTemplateCommand {
  version: number;
  riskCategoryId: string;
  sortOrder: number;
}
export type CentralRiskMutationResponse = MutationResponse;
export type CentralRiskRevisionResponse = RevisionMutationResponse;
