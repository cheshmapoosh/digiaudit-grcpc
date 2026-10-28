import type { ProcessNode } from "@/features/process/domain/process.model";
import { processService } from "@/features/process/service/process.service";
import { controlScopeApi } from "@/features/control-scope/infra/controlScope.api.repo";
import { controlObjectiveScopeApi } from "@/features/control-objective-scope/infra/controlObjectiveScope.api.repo";
import { requirementScopeApi } from "@/features/requirement-scope/infra/requirementScope.api.repo";
import type { LocalOption } from "../domain/local.model";
import type { OrganizationCentralScope, OrganizationScopeSection } from "../domain/organizationScopes.model";
import { localApi } from "./local.api.repo";

export type { OrganizationCentralScope } from "../domain/organizationScopes.model";

export interface OrganizationScopeSelectionData {
    processes: ProcessNode[];
    definitions: LocalOption[];
    scopes: OrganizationCentralScope[];
}

async function scopesForSubprocess(section: OrganizationScopeSection, subprocessId: string,
    signal?: AbortSignal): Promise<OrganizationCentralScope[]> {
    switch (section) {
        case "control-scopes":
            return (await controlScopeApi.listForSubprocess(subprocessId, "ACTIVE", "", signal)).map(row => ({
                id: row.id, subprocessId: row.subprocessId, definitionId: row.controlId,
                code: row.controlCode, name: row.controlTitle, status: row.status, validFrom: row.validFrom, validTo: row.validTo,
            }));
        case "control-objective-scopes":
            return (await controlObjectiveScopeApi.listForSubprocess(subprocessId, "ACTIVE", "", signal)).map(row => ({
                id: row.id, subprocessId: row.subprocessId, definitionId: row.controlObjectiveId,
                code: row.controlObjectiveCode, name: row.controlObjectiveTitle, status: row.status, validFrom: row.validFrom, validTo: row.validTo,
            }));
        case "requirement-scopes":
            return (await requirementScopeApi.listForSubprocess(subprocessId, "ACTIVE", "", signal)).map(row => ({
                id: row.id, subprocessId: row.subprocessId, definitionId: row.requirementId,
                code: row.requirementCode, name: row.requirementTitle, status: row.status, validFrom: row.validFrom, validTo: row.validTo,
            }));
    }
}

/** Only the supplied connected Subprocesses are queried; concrete Scope APIs keep their contracts. */
export async function loadOrganizationScopeSelection(section: OrganizationScopeSection, subprocessIds: string[],
    signal?: AbortSignal): Promise<OrganizationScopeSelectionData> {
    signal?.throwIfAborted();
    const ids = [...new Set(subprocessIds)].sort();
    const options = section === "control-scopes" ? "options/controls"
        : section === "control-objective-scopes" ? "options/control-objectives" : "options/requirements";
    const [processes, definitions, scopeGroups] = await Promise.all([
        processService.list(),
        localApi.allOptions(options),
        Promise.all(ids.map(id => scopesForSubprocess(section, id, signal))),
    ]);
    signal?.throwIfAborted();
    return { processes, definitions, scopes: scopeGroups.flat() };
}
