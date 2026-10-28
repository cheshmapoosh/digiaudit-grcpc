import { DialogFooter } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    List,
    ListItemStandard,
} from "@ui5/webcomponents-react";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";

import type { OrganizationNode } from "../domain/organization.model";
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
    busy?: boolean;
}

export default function ParentValueHelpDialog({
                                                  open,
                                                  items,
                                                  currentId,
                                                   selectedParentId,
                                                   onClose,
                                                   onSelect,
                                                   busy = false,
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

        return selectableItems.filter(
            (item) =>
                containsText(item.name, searchText) ||
                containsText(item.code, searchText),
        );
    }, [searchText, selectableItems]);

    const dialogTitle = t("organization.parent.dialog.title", {
        defaultValue: "انتخاب والد",
    });

    return (
        <Dialog
            className="catalogObjectDialog"
            open={open}
            accessibleName={dialogTitle}
            onClose={onClose}
        >
            <ModalDialogHeader title={dialogTitle} onClose={onClose}  actions={<HeaderSearch value={searchText} onChange={(value) => setSearchText(value)} accessibleName={t("organization.parent.dialog.search", {
                        defaultValue: "جستجو بر اساس کد",
                    })} />} />
            <div style={{ display: "grid", gap: "1rem", width: "100%", minWidth: 0, maxWidth: "100%" }}>


                <List separators="Inner" inert={busy} noDataText={t("common.noData")}>
                    <ListItemStandard type="Active" selected={!selectedParentId} onClick={() => { if (!busy) onSelect(null); }}>
                        {t("organization.parent.none", { defaultValue: "بدون والد" })}
                    </ListItemStandard>

                    {filteredItems.map((item) => (
                        <ListItemStandard
                            key={item.id}
                            type="Active"
                            selected={item.id === selectedParentId}
                            additionalText={item.code}
                            description={`${item.code} - ${item.name}`}
                            onClick={() => { if (!busy) onSelect(item.id); }}
                        >
                            {item.name}
                        </ListItemStandard>
                    ))}
                </List>

                <DialogFooter>
                    {selectedParentId ? <Button design="Negative" disabled={busy} onClick={() => onSelect(null)}>
                        {t("catalog.parentHeader.clear")}
                    </Button> : null}
                    <Button design="Transparent" disabled={busy} onClick={onClose}>
                        {t("common.close", { defaultValue: "بستن" })}
                    </Button>
                </DialogFooter>
            </div>
        </Dialog>
    );
}
