import { useMemo, useState } from "react";
import {
    Button,
    Dialog,
    FlexBox,
    FlexBoxDirection,
    Input,
    List,
    ListItemStandard,
    Text,
    Title,
} from "@ui5/webcomponents-react";

import type { RegulationId } from "../model/regulation.types";
import { buildRegulationTree, flattenRegulationTree, isDescendant } from "./tree.utils";
import { useRegulationStore } from "../state/regulation.store";

export function ParentValueHelpDialog({
                                          open,
                                          currentId,
                                          currentParentId,
                                          onClose,
                                          onSelectParent,
                                      }: {
    open: boolean;
    currentId?: RegulationId | null; // اگر در حال ویرایش هستیم
    currentParentId?: RegulationId | null;
    onClose: () => void;
    onSelectParent: (parentId: RegulationId | null) => void;
}) {
    const items = useRegulationStore((s) => s.items);
    const tree = useMemo(() => buildRegulationTree(items), [items]);
    const flat = useMemo(() => flattenRegulationTree(tree), [tree]);

    const [q, setQ] = useState("");

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return flat;
        return flat.filter(({ node }) => {
            const hay = `${node.code} ${node.label}`.toLowerCase();
            return hay.includes(qq);
        });
    }, [flat, q]);

    const canChoose = (candidateParentId: RegulationId) => {
        if (!currentId) return true;
        if (candidateParentId === currentId) return false;
        // parent cannot be inside current subtree
        return !isDescendant(tree, currentId, candidateParentId);
    };

    return (
        <Dialog
            open={open}
            headerText="انتخاب والد"
            onAfterClose={onClose}
            style={{ width: "720px" }}
            footer={
                <FlexBox direction={FlexBoxDirection.Row} style={{ width: "100%", justifyContent: "space-between" }}>
                    <Button design="Transparent" onClick={() => onSelectParent(null)}>
                        بدون والد (ریشه)
                    </Button>
                    <Button design="Emphasized" onClick={onClose}>
                        بستن
                    </Button>
                </FlexBox>
            }
        >
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
                <Title level="H6">جستجو</Title>
                <Input
                    placeholder="کد یا عنوان..."
                    value={q}
                    onInput={(e: any) => setQ(e.target.value)}
                />

                {!items.length ? (
                    <Text>موردی برای انتخاب وجود ندارد.</Text>
                ) : (
                    <List>
                        {filtered.map(({ node, level }) => {
                            const disabled = node.id ? !canChoose(node.id) : false;
                            const isSelected = (node.id ?? null) === (currentParentId ?? null);

                            return (
                                <ListItemStandard
                                    key={node.id}
                                    selected={isSelected}
                                    style={{
                                        paddingInlineStart: 8 + level * 18,
                                        opacity: disabled ? 0.45 : 1,
                                        pointerEvents: disabled ? "none" : "auto",
                                    }}
                                    additionalText={node.code}
                                    onClick={() => onSelectParent(node.id)}
                                >
                                    {node.label}
                                </ListItemStandard>
                            );
                        })}
                    </List>
                )}
            </div>
        </Dialog>
    );
}