// src/features/organization/components/OrganizationTree.tsx
import { Tree, TreeItem, FlexBox, FlexBoxDirection } from "@ui5/webcomponents-react";
import { useMemo } from "react";
import type { Organization } from "../types";
import type { OrgNode } from "../utils/orgTree";
import { buildOrgTree } from "../utils/orgTree";

function getAncestorIds(items: Organization[], selectedId?: string): Set<string> {
    const expanded = new Set<string>();
    if (!selectedId) return expanded;

    const byId = new Map(items.map(x => [x.id, x]));
    let cur = byId.get(selectedId);

    // از خود نود شروع نکن، فقط والدها را expand کن
    while (cur?.parentId) {
        expanded.add(cur.parentId);
        cur = byId.get(cur.parentId);
    }

    return expanded;
}

export function OrganizationTree({
                                     items,
                                     selectedId,
                                     expandOneLevelForId,
                                     onSelect
                                 }: {
    items: Organization[];
    selectedId?: string;
    expandOneLevelForId?: string;
    onSelect: (id: string) => void;
}) {
    const roots = useMemo(() => buildOrgTree(items), [items]);

    const expandedIds = useMemo(() => {
        const s = new Set<string>();

        // 1) ancestors of selected => to make it visible
        const byId = new Map(items.map((x) => [x.id, x]));
        if (selectedId) {
            let cur = byId.get(selectedId);
            while (cur?.parentId) {
                s.add(cur.parentId);
                cur = byId.get(cur.parentId);
            }
        }

        // 2) also expand the node we want to show its children (one level)
        if (expandOneLevelForId) {
            s.add(expandOneLevelForId);
        }

        return s;
    }, [items, selectedId, expandOneLevelForId]);

    const renderNode = (node: OrgNode) => {
        const label = `${node.org.code} — ${node.org.name}`;
        return (
            <TreeItem
                key={node.org.id}
                text={label}
                selected={node.org.id === selectedId}
                expanded={expandedIds.has(node.org.id)}
                data-orgid={node.org.id}
            >
                {node.children.map(renderNode)}
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

                    const id =
                        item?.getAttribute?.("data-orgid") ??
                        item?.dataset?.orgid ??
                        undefined;

                    // ✅ Debug (بعداً می‌تونی حذف کنی)
                    console.log("TREE click id=", id);

                    if (!id) return;
                    if (id === selectedId) return;
                    onSelect(id);
                }}
            >
                {roots.map(renderNode)}
            </Tree>
        </FlexBox>
    );
}
