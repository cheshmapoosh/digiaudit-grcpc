// src/features/process/components/ProcessTree.tsx
import { useMemo } from "react";
import { Tree, TreeItem, FlexBox, FlexBoxDirection } from "@ui5/webcomponents-react";
import type { ProcessNode } from "../model/process.types";

type ProcNode = { node: ProcessNode; children: ProcNode[] };

function buildProcessTree(items: ProcessNode[]): ProcNode[] {
    const byId = new Map(items.map((x) => [x.id, x]));
    const childrenMap = new Map<string | null, ProcessNode[]>();

    for (const it of items) {
        const key = it.parentId ?? null;
        if (!childrenMap.has(key)) childrenMap.set(key, []);
        childrenMap.get(key)!.push(it);
    }

    for (const [k, arr] of childrenMap.entries()) {
        arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        childrenMap.set(k, arr);
    }

    const make = (p: ProcessNode): ProcNode => ({
        node: p,
        children: (childrenMap.get(p.id) ?? []).map(make),
    });

    // root = parentId:null یا orphan (parentId دارد ولی parent در لیست نیست)
    const roots = items.filter((x) => (x.parentId ?? null) === null || (x.parentId && !byId.has(x.parentId)));
    const uniq = Array.from(new Map(roots.map((r) => [r.id, r])).values());
    uniq.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return uniq.map(make);
}

export function ProcessTree({
                                items,
                                selectedId,
                                expandOneLevelForId,
                                onSelect,
                            }: {
    items: ProcessNode[];
    selectedId?: string;
    expandOneLevelForId?: string;
    onSelect: (id: string) => void;
}) {
    const roots = useMemo(() => buildProcessTree(items), [items]);

    const expandedIds = useMemo(() => {
        const s = new Set<string>();
        const byId = new Map(items.map((x) => [x.id, x]));

        if (selectedId) {
            let cur = byId.get(selectedId);
            while (cur?.parentId) {
                s.add(cur.parentId);
                cur = byId.get(cur.parentId);
            }
        }
        if (expandOneLevelForId) s.add(expandOneLevelForId);
        return s;
    }, [items, selectedId, expandOneLevelForId]);

    const renderNode = (n: ProcNode) => {
        const label = `${n.node.code ?? "-"} — ${n.node.title}`;
        return (
            <TreeItem
                key={n.node.id}
                text={label}
                selected={n.node.id === selectedId}
                expanded={expandedIds.has(n.node.id)}
                data-id={n.node.id}
            >
                {n.children.map(renderNode)}
            </TreeItem>
        );
    };

    return (
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: 10, width: "100%" }}>
            <Tree
                mode="SingleSelect"
                style={{ width: "100%", maxHeight: "calc(100vh - 260px)", overflow: "auto" }}
                onItemClick={(e: any) => {
                    const item = e.detail?.item as any;
                    const id = item?.getAttribute?.("data-id") ?? item?.dataset?.id;
                    if (!id || id === selectedId) return;
                    onSelect(id);
                }}
            >
                {roots.map(renderNode)}
            </Tree>
        </FlexBox>
    );
}