export interface RequirementImportIssue {
  rowNumber: number;
  field: "FILE" | "ROW" | "title" | "description" | "code" | "sortOrder" | "validFrom" | "validTo";
  code: string;
}

export interface RequirementImportRow {
  rowNumber: number;
  code: string;
  title: string;
  description: string | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
  operation: "CREATE" | "RESTORE" | "ACTIVATE";
}

export interface RequirementImportPreview {
  regulationId: string;
  regulationTitle: string;
  fingerprint: string;
  valid: boolean;
  rows: RequirementImportRow[];
  issues: RequirementImportIssue[];
}

export interface RequirementImportResult {
  entityId: string;
  regulationId: string;
  revisionId: string;
  version: number;
  importedCount: number;
}
