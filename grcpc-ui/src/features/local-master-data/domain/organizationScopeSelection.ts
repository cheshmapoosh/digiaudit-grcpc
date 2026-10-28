import type { ProcessNode } from "@/features/process/domain/process.model";
import type { HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";
import type { OrganizationScopeSelectionData } from "../infra/organizationScopeSelection.api.repo";
import type { OrganizationLocalDraft } from "./organizationLocal.model";
import {
    organizationScopeIdentity,
    type OrganizationCentralScope,
    type OrganizationScopeContext,
    type OrganizationScopeRow,
    type OrganizationScopeSection,
} from "./organizationScopes.model";

export interface OrganizationScopeChoice {
    key: string;
    context: OrganizationScopeContext;
    original?: OrganizationScopeRow;
    centralScope?: OrganizationCentralScope;
    code: string;
    name: string;
    kind: "LOCAL" | "CENTRAL";
}

interface ChoiceInput {
    section: OrganizationScopeSection;
    contexts: OrganizationScopeContext[];
    rows: OrganizationScopeRow[];
    drafts: OrganizationLocalDraft[];
    data: OrganizationScopeSelectionData;
}

function ownsDraft(section: OrganizationScopeSection, context: OrganizationScopeContext, draft: OrganizationLocalDraft): boolean {
    return draft.section === section && (draft.ownerKey === context.key
        || Boolean(context.id && draft.contextRef?.contextId === context.id)
        || draft.contextRef?.subprocessId === context.subprocessId);
}

function belongsToSection(section: OrganizationScopeSection, row: OrganizationScopeRow): boolean {
    return section === "control-scopes" ? "controlId" in row
        : section === "control-objective-scopes" ? "controlObjectiveId" in row : "requirementId" in row;
}

/** Occupied Context/definition pairs retain their Local identity, metadata and historical source. */
export function buildOrganizationScopeChoices({ section, contexts, rows, drafts, data }: ChoiceInput): OrganizationScopeChoice[] {
    const subprocesses = new Map(data.processes.filter(row => row.nodeType === "SUBPROCESS").map(row => [row.id, row]));
    const activeDefinitions = new Set(data.definitions.filter(row => row.status === "ACTIVE").map(row => row.id));
    const activeScopes = data.scopes.filter(row => row.status === "ACTIVE");
    const scopesById = new Map(activeScopes.map(row => [row.id, row]));
    const latestRows = new Map<string, OrganizationScopeRow>();
    for (const row of rows) if (belongsToSection(section, row)
        && (!latestRows.has(row.id) || latestRows.get(row.id)!.version <= row.version)) latestRows.set(row.id, row);
    const choices: OrganizationScopeChoice[] = [];

    for (const context of contexts) {
        if (context.status === "DELETED") continue;
        const occupied = new Map([...latestRows.values()]
            .filter(row => row.organizationSubprocessScopeId === context.id)
            .map(row => [organizationScopeIdentity(row).id, row]));
        const contextDrafts = drafts.filter(draft => ownsDraft(section, context, draft));
        const canAdd = context.status === "ACTIVE" && subprocesses.get(context.subprocessId)?.status === "ACTIVE";

        for (const original of occupied.values()) {
            const identity = organizationScopeIdentity(original);
            const draft = contextDrafts.find(item => item.rowId === original.id || item.identityId === identity.id);
            const cancellingDelete = original.status !== "DELETED" && draft?.operation === "DELETE" && draft.status === "DELETED";
            if (!cancellingDelete && (original.status !== "DELETED" || draft && draft.status !== "DELETED")) continue;
            const centralScope = identity.centralReferenceId ? scopesById.get(identity.centralReferenceId) : undefined;
            if (!cancellingDelete) {
                if (!canAdd || !activeDefinitions.has(identity.id)) continue;
                if (original.sourceType === "INHERITED_FROM_CENTRAL" && (!centralScope
                    || centralScope.subprocessId !== context.subprocessId || centralScope.definitionId !== identity.id)) continue;
            }
            choices.push({
                key: `organization-scope-choice:${section}:${context.key}:${identity.id}:local:${original.id}`,
                context, original, centralScope, kind: "LOCAL", code: identity.code, name: identity.name,
            });
        }

        if (!canAdd) continue;
        for (const centralScope of activeScopes) {
            if (centralScope.subprocessId !== context.subprocessId || !activeDefinitions.has(centralScope.definitionId)
                || occupied.has(centralScope.definitionId)
                || contextDrafts.some(draft => draft.identityId === centralScope.definitionId && draft.status !== "DELETED")) continue;
            choices.push({
                key: `organization-scope-choice:${section}:${context.key}:${centralScope.definitionId}:central:${centralScope.id}`,
                context, centralScope, kind: "CENTRAL", code: centralScope.code, name: centralScope.name,
            });
        }
    }
    return choices.sort((left, right) => left.context.code.localeCompare(right.context.code)
        || left.code.localeCompare(right.code) || left.name.localeCompare(right.name) || left.key.localeCompare(right.key));
}

/** Process ancestors are display-only; the exact leaf supplies its connected Context automatically. */
export function buildOrganizationScopeChoiceNodes(choices: OrganizationScopeChoice[], processes: ProcessNode[],
    labels: { local: string; central: string }): HierarchySelectionNode[] {
    const sourceNodes = new Map(processes.map(row => [row.id, row]));
    const result = new Map<string, HierarchySelectionNode>();
    for (const choice of choices) {
        const branch = `organization-scope-picker:${choice.kind.toLowerCase()}`;
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
