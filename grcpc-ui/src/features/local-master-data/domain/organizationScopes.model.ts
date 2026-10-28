import type { LocalControlRow, LocalObjectiveRow, LocalRequirementRow, LocalStatus } from "./local.model";
import type { ContextRef, LocalRelationMetadata, OrganizationLocalDraft } from "./organizationLocal.model";

/** The three existing typed Local Scope families that share the Organization-wide selection surface. */
export type OrganizationScopeSection = "control-scopes" | "control-objective-scopes" | "requirement-scopes";
export type OrganizationScopeRow = LocalControlRow | LocalObjectiveRow | LocalRequirementRow;

/** An existing or explicitly staged Organization/Subprocess relationship. */
export interface OrganizationScopeContext {
    key: string;
    id: string | null;
    contextRef: ContextRef;
    subprocessId: string;
    code: string;
    name: string;
    status: LocalStatus;
}

export interface OrganizationScopesTableState {
    pending: boolean;
    ready: boolean;
    dirty: boolean;
}

/** Display data adapted from the concrete Central Scope DTOs; never a new API contract. */
export interface OrganizationCentralScope {
    id: string;
    subprocessId: string;
    definitionId: string;
    code: string;
    name: string;
    status: LocalStatus;
    validFrom: string | null;
    validTo: string | null;
}

export function organizationScopeIdentity(row: OrganizationScopeRow): {
    id: string; code: string; name: string; centralReferenceId: string | null;
} {
    if ("controlId" in row) return {
        id: row.controlId, code: row.controlCode, name: row.controlLabel, centralReferenceId: row.centralControlScopeId,
    };
    if ("controlObjectiveId" in row) return {
        id: row.controlObjectiveId, code: row.controlObjectiveCode, name: row.controlObjectiveLabel,
        centralReferenceId: row.centralControlObjectiveScopeId,
    };
    return {
        id: row.requirementId, code: row.requirementCode, name: row.requirementLabel,
        centralReferenceId: row.centralRequirementScopeId,
    };
}

function rowMetadata(row: OrganizationScopeRow): LocalRelationMetadata {
    return {
        validFrom: row.validFrom,
        validTo: row.validTo,
        ...("controlId" in row ? {
            actualOwnerId: row.actualOwnerId,
            frequencyCode: row.frequencyCode,
            executionMethodCode: row.executionMethodCode,
            testMethodCode: row.testMethodCode,
            localContextNote: row.localContextNote,
        } : {}),
    };
}

export function organizationScopeDraftFromRow(section: OrganizationScopeSection, row: OrganizationScopeRow,
    context?: OrganizationScopeContext): OrganizationLocalDraft {
    const ownerKey = context?.key ?? row.organizationSubprocessScopeId;
    const identity = organizationScopeIdentity(row);
    return {
        key: `${section}:${ownerKey}:${identity.id}`,
        section,
        ownerKey,
        identityId: identity.id,
        code: identity.code,
        name: identity.name,
        operation: "UPDATE",
        rowId: row.id,
        version: row.version,
        status: row.status,
        contextRef: context?.contextRef ?? { contextId: row.organizationSubprocessScopeId },
        sourceType: row.sourceType,
        centralReferenceId: identity.centralReferenceId,
        metadata: rowMetadata(row),
    };
}

/** Lifecycle and metadata are editable; an occupied pair retains its identity and historical source. */
export function normalizeOrganizationScopeDraft(next: OrganizationLocalDraft, original?: OrganizationScopeRow): OrganizationLocalDraft | null {
    const identity = original ? organizationScopeIdentity(original) : null;
    const occupied = original && identity ? {
        rowId: original.id,
        version: original.version,
        identityId: identity.id,
        sourceType: original.sourceType,
        centralReferenceId: identity.centralReferenceId,
    } : {};
    if (!original || original.status === "DELETED") {
        if (next.status === "DELETED") return null;
        return { ...next, ...occupied, operation: "CREATE_OR_RESTORE", status: "ACTIVE" };
    }
    const baseline = rowMetadata(original);
    const metadataChanged = next.metadata.validFrom !== baseline.validFrom || next.metadata.validTo !== baseline.validTo
        || "controlId" in original && (["actualOwnerId", "frequencyCode", "executionMethodCode", "testMethodCode", "localContextNote"] as const)
            .some(field => (next.metadata[field] ?? null) !== baseline[field]);
    if (next.status === original.status && !metadataChanged) return null;
    return {
        ...next,
        ...occupied,
        operation: next.status === "DELETED" ? "DELETE" : metadataChanged ? "UPDATE"
            : next.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE",
    };
}
