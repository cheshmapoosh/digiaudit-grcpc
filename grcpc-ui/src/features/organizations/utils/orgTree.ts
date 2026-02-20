// src/features/organization/utils/orgTree.ts
import type { Organization } from "../types";

export interface OrgNode {
    org: Organization;
    children: OrgNode[];
}

export function buildOrgTree(items: Organization[]): OrgNode[] {
    const byId = new Map<string, OrgNode>();
    const parentOf = new Map<string, string | undefined>();

    for (const org of items) {
        byId.set(org.id, { org, children: [] });
        parentOf.set(org.id, org.parentId);
    }

    const roots: OrgNode[] = [];

    const createsCycle = (parentId: string, childId: string): boolean => {
        // walk upwards from parentId; if we reach childId => cycle
        let cur: string | undefined = parentId;
        const seen = new Set<string>();
        while (cur) {
            if (cur === childId) return true;
            if (seen.has(cur)) return true; // already looped in the chain itself
            seen.add(cur);
            cur = parentOf.get(cur);
        }
        return false;
    };

    for (const org of items) {
        const node = byId.get(org.id)!;
        const parentId = org.parentId;

        // ✅ self-parent => treat as root
        if (!parentId || parentId === org.id || !byId.has(parentId)) {
            roots.push(node);
            continue;
        }

        // ✅ cycle protection
        if (createsCycle(parentId, org.id)) {
            roots.push(node);
            continue;
        }

        byId.get(parentId)!.children.push(node);
    }

    const sortRec = (nodes: OrgNode[]) => {
        nodes.sort((a, b) =>
            `${a.org.code} ${a.org.name}`.localeCompare(`${b.org.code} ${b.org.name}`)
        );
        for (const n of nodes) sortRec(n.children);
    };
    sortRec(roots);

    return roots;
}
