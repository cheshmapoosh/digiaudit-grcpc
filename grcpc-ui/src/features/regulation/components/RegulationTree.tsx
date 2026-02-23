import { useEffect, useMemo } from "react";
import { List, ListItemStandard, BusyIndicator, Text, Title } from "@ui5/webcomponents-react";
import type { RegulationTreeNode } from "../model/regulation.types";
import { useRegulationStore } from "../state/regulation.store";
import { buildRegulationTree, flattenRegulationTree } from "./tree.utils";

export default function RegulationTree() {
    const items = useRegulationStore((s) => s.items);
    const isLoading = useRegulationStore((s) => s.isLoading);
    const selectedId = useRegulationStore((s) => s.selectedId);
    const select = useRegulationStore((s) => s.select);
    const load = useRegulationStore((s) => s.load);

    useEffect(() => {
        if (!items.length) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tree = useMemo(() => buildRegulationTree(items), [items]);
    const flat = useMemo(() => flattenRegulationTree(tree), [tree]);

    if (isLoading) {
        return (
            <div style={{ padding: 12 }}>
                <BusyIndicator active />
            </div>
        );
    }

    return (
        <div style={{ padding: 12 }}>
            <Title level="H5">درخت قوانین و مقررات</Title>
            {!items.length ? (
                <Text>موردی وجود ندارد.</Text>
            ) : (
                <List>
                    {flat.map(({ node, level }) => (
                        <TreeRow
                            key={node.id}
                            node={node}
                            level={level}
                            selected={node.id === selectedId}
                            onSelect={() => select(node.id)}
                        />
                    ))}
                </List>
            )}
        </div>
    );
}

function TreeRow({
                     node,
                     level,
                     selected,
                     onSelect,
                 }: {
    node: RegulationTreeNode;
    level: number;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <ListItemStandard
            selected={selected}
            onClick={onSelect}
            style={{ paddingInlineStart: 8 + level * 18 }}
            additionalText={node.code}
        >
            {node.label}
        </ListItemStandard>
    );
}