import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    Dialog,
    Input,
    List,
    ListItemStandard,
} from "@ui5/webcomponents-react";

import type { OrganizationNode } from "@/features/organization";
import {
    buildTree,
    collectDescendantIds,
    flattenTree,
} from "../utils/organization.tree";
import { containsText } from "../utils/tree.utils";

export interface ParentValueHelpDialogProps {
    open: boolean;
    items: OrganizationNode[];
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

        return selectableItems.filter((item) => containsText(item.name, searchText));
    }, [searchText, selectableItems]);

    return (
        <Dialog
            open={open}
            headerText={t("organization.parent.dialog.title", {
                defaultValue: "انتخاب والد",
            })}
            onClose={onClose}
        >
            <div style={{ display: "grid", gap: "1rem", minWidth: "32rem", maxWidth: "90vw" }}>
                <Input
                    value={searchText}
                    placeholder={t("organization.parent.dialog.search", {
                        defaultValue: "جستجو بر اساس نام",
                    })}
                    onInput={(event) => setSearchText(event.target.value)}
                />

                <List separators="Inner">
                    <ListItemStandard selected={!selectedParentId} onClick={() => onSelect(null)}>
                        {t("organization.parent.none", { defaultValue: "بدون والد" })}
                    </ListItemStandard>

                    {filteredItems.map((item) => (
                        <ListItemStandard
                            key={item.id}
                            selected={item.id === selectedParentId}
                            additionalText={item.code}
                            description={item.description ?? ""}
                            onClick={() => onSelect(item.id)}
                        >
                            {item.name}
                        </ListItemStandard>
                    ))}
                </List>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                    <Button design="Transparent" onClick={onClose}>
                        {t("common.close", { defaultValue: "بستن" })}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}