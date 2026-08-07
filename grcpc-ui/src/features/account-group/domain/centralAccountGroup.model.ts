import type { DocumentAggregateRequest } from "@/features/document";
import type {
  DefinitionDetailFields,
  MutationResponse,
  RevisionMutationResponse,
} from "@/features/central-catalog/components/catalogPresentation.model";
export interface CentralAccountGroupSummary extends DefinitionDetailFields {
  parentAccountGroupId: string | null;
  sortOrder: number;
}
export type CentralAccountGroupDetail = CentralAccountGroupSummary;
export interface CreateCentralAccountGroupCommand {
  code: string;
  title: string;
  parentAccountGroupId: string | null;
  description: string | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}
export interface UpdateCentralAccountGroupCommand {
  version: number;
  title: string;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}
export interface MoveCentralAccountGroupCommand {
  version: number;
  parentAccountGroupId: string | null;
  sortOrder: number;
}
export type CentralAccountGroupMutationResponse = MutationResponse;
export type CentralAccountGroupRevisionResponse = RevisionMutationResponse;
