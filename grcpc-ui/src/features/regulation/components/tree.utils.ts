import type { RegulationEntity, RegulationTreeNode } from "../model/regulation.types";

export function buildRegulationTree(items: RegulationEntity[]): RegulationTreeNode[] {
    const byId = new Map<string, RegulationEntity>();
    for (const it of items) byId.set(it.id, it);

    const nodeById = new Map<string, RegulationTreeNode>();
    for (const it of items) {
        nodeById.set(it.id, {
            id: it.id,
            label: it.title,
            code: it.code,
            parentId: it.parentId ?? null,
            entity: it,
            children: [],
        });
    }

    const roots: RegulationTreeNode[] = [];
    for (const it of items) {
        const node = nodeById.get(it.id)!;
        const p = it.parentId ? nodeById.get(it.parentId) : undefined;
        if (p) p.children.push(node);
        else roots.push(node);
    }

    // sort stable: code then title
    const sortRec = (nodes: RegulationTreeNode[]) => {
        nodes.sort((a, b) => (a.code || "").localeCompare(b.code || "") || a.label.localeCompare(b.label));
        for (const n of nodes) sortRec(n.children);
    };
    sortRec(roots);

    return roots;
}

export function flattenRegulationTree(
    roots: RegulationTreeNode[],
    level = 0
): Array<{ node: RegulationTreeNode; level: number }> {
    const out: Array<{ node: RegulationTreeNode; level: number }> = [];
    for (const r of roots) {
        out.push({ node: r, level });
        if (r.children?.length) out.push(...flattenRegulationTree(r.children, level + 1));
    }
    return out;
}

export function isDescendant(
    treeRoots: RegulationTreeNode[],
    ancestorId: string,
    maybeDescendantId: string
): boolean {
    const stack = [...treeRoots];
    while (stack.length) {
        const n = stack.pop()!;
        if (n.id === ancestorId) {
            // search inside ancestor subtree
            const sub = [...n.children];
            while (sub.length) {
                const s = sub.pop()!;
                if (s.id === maybeDescendantId) return true;
                sub.push(...s.children);
            }
            return false;
        }
        stack.push(...n.children);
    }
    return false;
}