import type { LocalRiskRow, LocalStatus } from "./local.model";
import type { ContextRef, OrganizationLocalDraft } from "./organizationLocal.model";

/** An existing or staged Organization/Subprocess relationship, never a picker-created Context. */
export interface OrganizationRiskContext {
    key: string;
    id: string | null;
    contextRef: ContextRef;
    subprocessId: string;
    code: string;
    name: string;
    status: LocalStatus;
}

export interface OrganizationRisksTableState {
    pending: boolean;
    ready: boolean;
    dirty: boolean;
}

export function organizationRiskDraftFromRow(row: LocalRiskRow, context?: OrganizationRiskContext): OrganizationLocalDraft {
    const ownerKey = context?.key ?? row.organizationSubprocessScopeId;
    return {
        key: `risk-scopes:${ownerKey}:${row.riskTemplateId}`,
        section: "risk-scopes",
        ownerKey,
        identityId: row.riskTemplateId,
        code: row.riskTemplateCode,
        name: row.riskTemplateLabel,
        operation: "UPDATE",
        rowId: row.id,
        version: row.version,
        status: row.status,
        contextRef: context?.contextRef ?? { contextId: row.organizationSubprocessScopeId },
        sourceType: row.sourceType,
        centralReferenceId: row.centralRiskScopeId,
        metadata: { validFrom: row.validFrom, validTo: row.validTo },
    };
}

/** Only dates and lifecycle can change on an occupied Local Risk pair. */
export function normalizeOrganizationRiskDraft(next: OrganizationLocalDraft, original?: LocalRiskRow): OrganizationLocalDraft | null {
    if (!original || original.status === "DELETED") {
        if (next.status === "DELETED") return null;
        return {
            ...next,
            operation: "CREATE_OR_RESTORE",
            status: "ACTIVE",
            ...(original ? { rowId: original.id, version: original.version, sourceType: original.sourceType, centralReferenceId: original.centralRiskScopeId } : {}),
        };
    }
    const metadataChanged = next.metadata.validFrom !== original.validFrom || next.metadata.validTo !== original.validTo;
    if (next.status === original.status && !metadataChanged) return null;
    return {
        ...next,
        rowId: original.id,
        version: original.version,
        sourceType: original.sourceType,
        centralReferenceId: original.centralRiskScopeId,
        operation: next.status === "DELETED" ? "DELETE" : metadataChanged ? "UPDATE" : next.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE",
    };
}
