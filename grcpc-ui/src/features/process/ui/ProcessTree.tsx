import { useEffect, useMemo } from "react";
import { BusyIndicator, Tree, TreeItem } from "@ui5/webcomponents-react";
import { useProcessStore } from "../state/process.store";
import { parentKey } from "./tree.utils";

type Props = {
    height?: string; // e.g. "calc(100vh - 220px)"
};

export function ProcessTree({ height = "calc(100vh - 220px)" }: Props) {
    const {
        nodesById,
        childrenByParent,
        loadedChildren,
        expanded,
        selectedId,
        loadChildren,
        toggleExpand,
        select,
    } = useProcessStore();

    const rootKey = parentKey(null);
    const rootLoaded = !!loadedChildren[rootKey];

    useEffect(() => {
        void loadChildren(null);
    }, [loadChildren]);

    const rootIds = useMemo(() => childrenByParent[rootKey] ?? [], [childrenByParent, rootKey]);

    const renderNode = (id: string) => {
        const node = nodesById[id];
        if (!node) return null;

        const isExpanded = !!expanded[id];
        const childrenKey = parentKey(id); // parentId = id
        const childIds = childrenByParent[childrenKey] ?? [];
        const childrenLoaded = !!loadedChildren[childrenKey];

        // نکته: اگر backend می‌تونه "hasChildren" بده، می‌تونی اینجا indicator دقیق‌تر بسازی.
        // اینجا: اگر childrenLoaded و خالی => leaf محسوب می‌شه.
        const showChildren = isExpanded && childrenLoaded;

        return (
            <TreeItem
                key={id}
                text={node.title}
                selected={selectedId === id}
                expanded={isExpanded}
                additionalText={node.code ?? ""}
                onClick={() => select(id)}
                // بعضی نسخه‌ها: onToggle یا onItemToggle
                onToggle={async () => {
                    const willExpand = !isExpanded;
                    toggleExpand(id);

                    if (willExpand && !childrenLoaded) {
                        await loadChildren(id);
                    }
                }}
            >
                {showChildren ? childIds.map(renderNode) : null}
            </TreeItem>
        );
    };

    return (
        <div style={{ height, overflow: "auto" }}>
            {!rootLoaded ? (
                <BusyIndicator active />
            ) : (
                <Tree>{rootIds.map(renderNode)}</Tree>
            )}
        </div>
    );
}
