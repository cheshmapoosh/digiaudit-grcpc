import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    Dialog,
    Input,
    List,
    ListItemStandard,
} from "@ui5/webcomponents-react";

import type { ProcessNode } from "@/features/process";
import {
    buildTree,
    collectDescendantIds,
    flattenTree,
} from "../utils/process.tree";
import { containsText } from "../utils/tree.utils";

export interface ParentValueHelpDialogProps {
    open: boolean;
    items: ProcessNode[];
    currentId?: string | null;
    selectedParentId?: string | null;
    onClose: () => void;
    onSelect: (parentId: string | null) => void;
}

export default function ParentValueHelpDialog({
                                                  open,
                                                  items,
                                                  currentId,
                                                  selectedParentId,
                                                  onClose,
                                                  onSelect,
                                              }: ParentValueHelpDialogProps) {
    const { t } = useTranslation();
    const [searchText, setSearchText] = useState("");

    const selectableItems = useMemo(() => {
        const tree = buildTree(items);
        const excludedIds = new Set<string>([
            ...(currentId ? [currentId] : []),
            ...collectDescendantIds(tree, currentId),
        ]);

        return flattenTree(tree).filter((item) => !excludedIds.has(item.id));
    }, [currentId, items]);

    const filteredItems = useMemo(() => {
        if (!searchText.trim()) {
            return selectableItems;
        }

        return selectableItems.filter((item) => containsText(item.title, searchText));
    }, [searchText, selectableItems]);

    return (
        <Dialog
            open={open}
            headerText={t("process.parent.dialog.title", { defaultValue: "انتخاب والد" })}
            onClose={onClose}
        >
            <div style={{ display: "grid", gap: "1rem", minWidth: "32rem", maxWidth: "90vw" }}>
                <Input
                    value={searchText}
                    placeholder={t("process.parent.dialog.search", {
                        defaultValue: "جستجو بر اساس عنوان",
                    })}
                    onInput={(event) => setSearchText(event.target.value)}
                />

                <List separators="Inner">
                    <ListItemStandard
                        selected={!selectedParentId}
                        onClick={() => onSelect(null)}
                    >
                        {t("process.parent.none", { defaultValue: "بدون والد" })}
                    </ListItemStandard>

                    {filteredItems.map((item) => (
                        <ListItemStandard
                            key={item.id}
                            selected={item.id === selectedParentId}
                            additionalText={item.code}
                            description={item.description ?? ""}
                            onClick={() => onSelect(item.id)}
                        >
                            {item.title}
                        </ListItemStandard>
                    ))}
                </List>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "0.5rem",
                    }}
                >
                    <Button design="Transparent" onClick={onClose}>
                        {t("common.close", { defaultValue: "بستن" })}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}