import { useEffect, useMemo, useState } from "react";
import { Dialog, Button, Text, Select, Option, BusyIndicator } from "@ui5/webcomponents-react";
import { useProcessStore } from "../state/process.store";
import { parentKey } from "./tree.utils";
import type { ProcessNode } from "../model/process.types";

type Props = {
    open: boolean;
    node: ProcessNode;
    onClose: () => void;
};

export function MoveNodeDialog({ open, node, onClose }: Props) {
    const { nodesById, childrenByParent, loadedChildren, loadChildren, moveNode } = useProcessStore();

    const [targetParentId, setTargetParentId] = useState<string | null>(node.parentId ?? null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setTargetParentId(node.parentId ?? null);
    }, [node]);

    useEffect(() => {
        // حداقل root رو داشته باشیم تا لیست انتخاب والد ساخته بشه
        void loadChildren(null);
    }, [loadChildren]);

    // ساده‌ترین UX: انتخاب والد از یک Select (لیست همه نودها)
    // نسخه‌ی بهتر: یک Tree picker (بعداً می‌تونیم اضافه کنیم).
    const allNodes = useMemo(() => Object.values(nodesById), [nodesById]);
    const rootLoaded = !!loadedChildren[parentKey(null)];

    const isInvalid =
        targetParentId === node.id; // parent cannot be itself
    // NOTE: جلوگیری از cycle (انتخاب parent از زیرشاخه‌های خودش) باید در backend چک شود.
    // اگر خواستی در UI هم enforce کنیم، باید descendantها را از store استخراج کنیم.

    const submit = async () => {
        if (saving || isInvalid) return;
        setSaving(true);
        try {
            await moveNode(node.id, targetParentId);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            headerText="جابجایی نود"
            onAfterClose={onClose}
            footer={
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
                    <Button design="Transparent" onClick={onClose} disabled={saving}>
                        انصراف
                    </Button>
                    <Button design="Emphasized" onClick={submit} disabled={saving || isInvalid}>
                        {saving ? "در حال انجام..." : "جابجا کن"}
                    </Button>
                </div>
            }
        >
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
                <Text>نود: {node.title}</Text>

                {!rootLoaded ? (
                    <BusyIndicator active />
                ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                        <Text>والد جدید</Text>
                        <Select
                            value={targetParentId ?? "__root__"}
                            onChange={(e: any) => {
                                const v = e.detail.selectedOption.value as string;
                                setTargetParentId(v === "__root__" ? null : v);
                            }}
                        >
                            <Option value="__root__">ROOT</Option>
                            {allNodes
                                .filter((n) => n.id !== node.id)
                                .sort((a, b) => a.title.localeCompare(b.title, "fa"))
                                .map((n) => (
                                    <Option key={n.id} value={n.id}>
                                        {n.title}
                                    </Option>
                                ))}
                        </Select>

                        {isInvalid ? <Text style={{ color: "var(--sapNegativeColor)" }}>والد نمی‌تواند خود نود باشد.</Text> : null}
                    </div>
                )}
            </div>
        </Dialog>
    );
}
