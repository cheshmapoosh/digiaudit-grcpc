import type { ProcessNode } from "@/features/process/domain/process.model";
import type { CentralSubprocessRiskScope } from "@/features/risk-scope/domain/riskScope.model";
import type { HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { OrganizationRiskSelectionData } from "../infra/organizationRiskSelection.api.repo";
import type { LocalRiskRow } from "./local.model";
import type { OrganizationLocalDraft } from "./organizationLocal.model";
import type { OrganizationRiskContext } from "./organizationRisks.model";

export interface OrganizationRiskChoice {
    key: string;
    context: OrganizationRiskContext;
    original?: LocalRiskRow;
    centralScope?: CentralSubprocessRiskScope;
    code: string;
    name: string;
    kind: "LOCAL" | "CENTRAL";
}

interface ChoiceInput {
    contexts: OrganizationRiskContext[];
    rows: LocalRiskRow[];
    drafts: OrganizationLocalDraft[];
    data: OrganizationRiskSelectionData;
}

function ownsDraft(context: OrganizationRiskContext, draft: OrganizationLocalDraft): boolean {
    return draft.section === "risk-scopes" && (draft.ownerKey === context.key
        || Boolean(context.id && draft.contextRef?.contextId === context.id)
        || draft.contextRef?.subprocessId === context.subprocessId);
}

/** Occupied pairs always keep their Local identity and source, including historical LOCAL_ADDED rows. */
export function buildOrganizationRiskChoices({ contexts, rows, drafts, data }: ChoiceInput): OrganizationRiskChoice[] {
    const subprocesses = new Map(data.processes.filter(row => row.nodeType === "SUBPROCESS").map(row => [row.id, row]));
    const activeTemplates = new Set(data.riskTemplates.filter(row => row.status === "ACTIVE").map(row => row.id));
    const activeScopes = data.scopes.filter(row => row.status === "ACTIVE");
    const scopesById = new Map(activeScopes.map(row => [row.id, row]));
    const latestRows = new Map<string, LocalRiskRow>();
    for (const row of rows) if (!latestRows.has(row.id) || latestRows.get(row.id)!.version <= row.version) latestRows.set(row.id, row);
    const choices: OrganizationRiskChoice[] = [];

    for (const context of contexts) {
        if (context.status === "DELETED") continue;
        const occupied = new Map([...latestRows.values()]
            .filter(row => row.organizationSubprocessScopeId === context.id)
            .map(row => [row.riskTemplateId, row]));
        const contextDrafts = drafts.filter(draft => ownsDraft(context, draft));
        const canAdd = context.status === "ACTIVE" && subprocesses.get(context.subprocessId)?.status === "ACTIVE";

        for (const original of occupied.values()) {
            const draft = contextDrafts.find(item => item.rowId === original.id || item.identityId === original.riskTemplateId);
            const cancellingDelete = original.status !== "DELETED" && draft?.operation === "DELETE" && draft.status === "DELETED";
            if (!cancellingDelete && (original.status !== "DELETED" || draft && draft.status !== "DELETED")) continue;
            const centralScope = original.centralRiskScopeId ? scopesById.get(original.centralRiskScopeId) : undefined;
            if (!cancellingDelete) {
                if (!canAdd || !activeTemplates.has(original.riskTemplateId)) continue;
                if (original.sourceType === "INHERITED_FROM_CENTRAL" && (!centralScope
                    || centralScope.subprocessId !== context.subprocessId || centralScope.riskTemplateId !== original.riskTemplateId)) continue;
            }
            choices.push({
                key: `organization-risk-choice:${context.key}:${original.riskTemplateId}:local:${original.id}`,
                context, original, centralScope, kind: "LOCAL", code: original.riskTemplateCode, name: original.riskTemplateLabel,
            });
        }

        if (!canAdd) continue;
        for (const centralScope of activeScopes) {
            if (centralScope.subprocessId !== context.subprocessId || !activeTemplates.has(centralScope.riskTemplateId)
                || occupied.has(centralScope.riskTemplateId)
                || contextDrafts.some(draft => draft.identityId === centralScope.riskTemplateId && draft.status !== "DELETED")) continue;
            choices.push({
                key: `organization-risk-choice:${context.key}:${centralScope.riskTemplateId}:central:${centralScope.id}`,
                context, centralScope, kind: "CENTRAL", code: centralScope.riskTemplateCode, name: centralScope.riskTemplateTitle,
            });
        }
    }
    return choices.sort((left, right) => left.context.code.localeCompare(right.context.code)
        || left.code.localeCompare(right.code) || left.name.localeCompare(right.name) || left.key.localeCompare(right.key));
}

/** Every displayed ancestor belongs to a candidate's assigned Subprocess; only exact Risk leaves are selectable. */
export function buildOrganizationRiskChoiceNodes(choices: OrganizationRiskChoice[], processes: ProcessNode[],
    labels: { local: string; central: string }): HierarchySelectionNode[] {
    const sourceNodes = new Map(processes.map(row => [row.id, row]));
    const result = new Map<string, HierarchySelectionNode>();
    for (const choice of choices) {
        const branch = `organization-risk-picker:${choice.kind.toLowerCase()}`;
        if (!result.has(branch)) result.set(branch, {
            id: branch, parentId: null, code: "", name: choice.kind === "LOCAL" ? labels.local : labels.central, selectable: false,
        });
        const subprocess = sourceNodes.get(choice.context.subprocessId);
        const ancestry: ProcessNode[] = [];
        const seen = new Set<string>([choice.context.subprocessId]);
        let process = subprocess?.parentId ? sourceNodes.get(subprocess.parentId) : undefined;
        while (process?.nodeType === "PROCESS" && !seen.has(process.id)) {
            seen.add(process.id); ancestry.push(process);
            process = process.parentId ? sourceNodes.get(process.parentId) : undefined;
        }
        let parentId = branch;
        for (const ancestor of ancestry.reverse()) {
            const id = `${branch}:process:${ancestor.id}`;
            if (!result.has(id)) result.set(id, { id, parentId, code: ancestor.code, name: ancestor.title, selectable: false });
            parentId = id;
        }
        const contextId = `${branch}:context:${choice.context.key}`;
        if (!result.has(contextId)) result.set(contextId, {
            id: contextId, parentId, code: subprocess?.code ?? choice.context.code,
            name: subprocess?.title ?? choice.context.name, selectable: false,
        });
        result.set(choice.key, { id: choice.key, parentId: contextId, code: choice.code, name: choice.name, selectable: true });
    }
    return [...result.values()];
}
