import type { DocumentAggregateRequest } from "@/features/document";
import type {
  DefinitionDetailFields,
  MutationResponse,
  RevisionMutationResponse,
} from "@/features/central-catalog/components/catalogPresentation.model";

export type CentralControlSummary = DefinitionDetailFields;
export type CentralControlDetail = CentralControlSummary;
export interface CreateCentralControlCommand {
  code: string;
  title: string;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
}
export interface UpdateCentralControlCommand {
  title: string;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  version: number;
  documents: DocumentAggregateRequest;
}
export type CentralControlMutationResponse = MutationResponse;
export type CentralControlRevisionResponse = RevisionMutationResponse;
