import type { CentralRegulationRequirementSummary } from "./centralRegulation.model";
import type { RequirementImportRow } from "./requirementImport.model";

export type RegulationRequirementStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type RegulationRequirementOperation = "CREATE" | "ACTIVATE" | "INACTIVATE" | "DELETE";

/** UI-only row identity is never submitted as a persisted Requirement ID. */
export interface RegulationRequirementDraft {
  key: string;
  operation: RegulationRequirementOperation;
  requirementId?: string;
  version?: number;
  code: string;
  title: string;
  description: string | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
}

export interface RegulationRequirementChange {
  operation: RegulationRequirementOperation;
  requirementId?: string;
  version?: number;
  code?: string;
  title?: string;
  description?: string | null;
  sortOrder?: number;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface RegulationRequirementTableRow {
  key: string;
  id: string | null;
  code: string;
  title: string;
  description: string | null;
  sortOrder: number;
  status: RegulationRequirementStatus;
  validFrom: string | null;
  validTo: string | null;
  original?: CentralRegulationRequirementSummary;
  change?: RegulationRequirementDraft;
}

export function regulationRequirementStatus(change?: RegulationRequirementDraft,
  original?: CentralRegulationRequirementSummary): RegulationRequirementStatus {
  return change?.operation === "DELETE" ? "DELETED" : change?.operation === "INACTIVATE" ? "INACTIVE"
    : change ? "ACTIVE" : original?.status ?? "ACTIVE";
}

export function regulationRequirementRows(requirements: CentralRegulationRequirementSummary[],
  changes: RegulationRequirementDraft[]): RegulationRequirementTableRow[] {
  const rows: RegulationRequirementTableRow[] = requirements.map(original => {
    const change = changes.find(item => item.requirementId === original.id);
    return { key: `requirement:${original.id}`, id: original.id, code: original.code, title: original.title,
      description: change?.description ?? original.description ?? null, sortOrder: original.sortOrder, validFrom: original.validFrom ?? null,
      validTo: original.validTo ?? null, original, change, status: regulationRequirementStatus(change, original) };
  });
  const imported: RegulationRequirementTableRow[] = changes.filter(change => change.operation === "CREATE").map(change => ({
    key: change.key, id: null, code: change.code, title: change.title, description: change.description,
    sortOrder: change.sortOrder, validFrom: change.validFrom, validTo: change.validTo,
    change, status: "ACTIVE" as const,
  }));
  return [...rows, ...imported].filter(row => row.change || row.original?.status !== "DELETED");
}

export function requirementImportDrafts(rows: RequirementImportRow[]): RegulationRequirementDraft[] {
  return rows.map(row => ({ key: `requirement-import:${encodeURIComponent(row.code)}`,
    operation: "CREATE", code: row.code, title: row.title, description: row.description,
    sortOrder: row.sortOrder, validFrom: row.validFrom, validTo: row.validTo }));
}

/** A lifecycle round trip to the persisted state removes the effective change. */
export function changeRequirementStatus(row: RegulationRequirementTableRow,
  status: RegulationRequirementStatus): RegulationRequirementDraft | null {
  if (!row.original || row.original.status === "DELETED") return status === "DELETED" ? null : row.change ?? null;
  if (row.original.status === status) return null;
  return { key: row.key, requirementId: row.original.id, version: row.original.version,
    operation: status === "DELETED" ? "DELETE" : status === "INACTIVE" ? "INACTIVATE" : "ACTIVATE",
    code: row.code, title: row.title, description: row.description, sortOrder: row.sortOrder,
    validFrom: row.validFrom, validTo: row.validTo };
}

export function toRegulationRequirementChanges(changes: RegulationRequirementDraft[]): RegulationRequirementChange[] {
  return changes.map<RegulationRequirementChange>(change => change.operation === "CREATE" ? {
    operation: "CREATE", code: change.code, title: change.title, description: change.description,
    sortOrder: change.sortOrder, validFrom: change.validFrom, validTo: change.validTo,
  } : { operation: change.operation, requirementId: change.requirementId, version: change.version });
}
