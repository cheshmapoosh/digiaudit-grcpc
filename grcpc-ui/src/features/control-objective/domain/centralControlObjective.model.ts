import type { DocumentAggregateRequest } from "@/features/document";
import type {
  DefinitionDetailFields,
  MutationResponse,
  RevisionMutationResponse,
} from "@/features/central-catalog/components/catalogPresentation.model";
export type CentralControlObjectiveSummary = DefinitionDetailFields;
export type CentralControlObjectiveDetail = CentralControlObjectiveSummary;
export interface CreateCentralControlObjectiveCommand {
  code: string;
  title: string;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}
export interface UpdateCentralControlObjectiveCommand {
  title: string;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  version: number;
  documents: DocumentAggregateRequest;
}
export type CentralControlObjectiveMutationResponse = MutationResponse;
export type CentralControlObjectiveRevisionResponse = RevisionMutationResponse;
