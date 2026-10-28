import type { ProcessNode } from "@/features/process/domain/process.model";
import { processService } from "@/features/process/service/process.service";
import type { CentralSubprocessRiskScope } from "@/features/risk-scope/domain/riskScope.model";
import { riskScopeApi } from "@/features/risk-scope/infra/riskScope.api.repo";
import type { LocalOption } from "../domain/local.model";
import { localApi } from "./local.api.repo";

export interface OrganizationRiskSelectionData {
    processes: ProcessNode[];
    riskTemplates: LocalOption[];
    scopes: CentralSubprocessRiskScope[];
}

/** Central Scope reads are limited to the Organization's supplied assigned Subprocesses. */
export async function loadOrganizationRiskSelection(subprocessIds: string[], signal?: AbortSignal): Promise<OrganizationRiskSelectionData> {
    signal?.throwIfAborted();
    const ids = [...new Set(subprocessIds)].sort();
    const [processes, riskTemplates, scopeGroups] = await Promise.all([
        processService.list(),
        localApi.allOptions("options/risk-templates"),
        Promise.all(ids.map(id => riskScopeApi.listForSubprocess(id, "ACTIVE", "", signal))),
    ]);
    signal?.throwIfAborted();
    return { processes, riskTemplates, scopes: scopeGroups.flat() };
}
