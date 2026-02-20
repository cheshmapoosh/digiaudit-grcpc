// src/features/process/service/process.tree.ts
import type { ProcessNode } from "../model/process.types";

export function buildChildrenMap(nodes: ProcessNode[]): Record<string, string[]> {
    const map: Record<string, ProcessNode[]> = {};
    for (const n of nodes) {
        const key = n.parentId ?? "__root__";
        map[key] ??= [];
        map[key].push(n);
    }

    // sort by order
    const result: Record<string, string[]> = {};
    for (const key of Object.keys(map)) {
        result[key] = map[key].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((x) => x.id);
    }
    return result;
}

export function isDescendant(nodesById: Record<string, ProcessNode>, ancestorId: string, maybeDescId: string): boolean {
    // walk up from maybeDescId to root; if hits ancestorId => descendant
    let cur: ProcessNode | undefined = nodesById[maybeDescId];
    while (cur && cur.parentId) {
        if (cur.parentId === ancestorId) return true;
        cur = nodesById[cur.parentId];
    }
    return false;
}

export function recomputeDepthAndPath(nodes: ProcessNode[]): ProcessNode[] {
    const byId: Record<string, ProcessNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const memo: Record<string, { depth: number; path: string }> = {};

    const compute = (id: string): { depth: number; path: string } => {
        if (memo[id]) return memo[id];
        const n = byId[id];
        if (!n) return (memo[id] = { depth: 0, path: `/${id}` });

        if (!n.parentId) return (memo[id] = { depth: 0, path: `/${id}` });

        const parent = byId[n.parentId];
        if (!parent) return (memo[id] = { depth: 0, path: `/${id}` });

        const p = compute(parent.id);
        return (memo[id] = { depth: p.depth + 1, path: `${p.path}/${id}` });
    };

    return nodes.map((n) => {
        const { depth, path } = compute(n.id);
        return { ...n, depth, path };
    });
}
