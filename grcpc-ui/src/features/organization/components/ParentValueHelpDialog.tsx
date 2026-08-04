import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    Dialog,
    Input,
    List,
    ListItemStandard,
} from "@ui5/webcomponents-react";
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
    onConfirm?: () => void;
    confirmDisabled?: boolean;
    busy?: boolean;
}

export default function ParentValueHelpDialog({
                                                  open,
                                                  items,
                                                  currentId,
                                                   selectedParentId,
                                                   onClose,
                                                   onSelect,
                                                   onConfirm,
                                                   confirmDisabled = false,
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
                containsText(item.displayLabel, searchText) ||
                containsText(item.code, searchText),
        );
    }, [searchText, selectableItems]);

    const dialogTitle = t("organization.parent.dialog.title", {
        defaultValue: "انتخاب والد",
    });

    const selectedParent = selectedParentId
        ? items.find((item) => item.id === selectedParentId) ?? null
        : null;

    return (
        <Dialog
            open={open}
            accessibleName={dialogTitle}
            style={{ width: "90vw", maxWidth: "90vw" }}
            onClose={onClose}
        >
            <ModalDialogHeader title={dialogTitle} onClose={onClose} />
            <div style={{ display: "grid", gap: "1rem", minWidth: "32rem", maxWidth: "90vw" }}>
                <Input
                    value={searchText}
                    placeholder={t("organization.parent.dialog.search", {
                        defaultValue: "جستجو بر اساس کد",
                    })}
                    onInput={(event) => setSearchText(event.target.value)}
                />

                {onConfirm ? (
                    <Input
                        readonly
                        accessibleName={t("organization.move.candidate", {
                            defaultValue: "Selected destination",
                        })}
                        value={selectedParent?.displayLabel || selectedParent?.code || t(
                            "organization.parent.none",
                            { defaultValue: "No parent" },
                        )}
                    />
                ) : null}

                <List separators="Inner">
                    <ListItemStandard selected={!selectedParentId} onClick={() => onSelect(null)}>
                        {t("organization.parent.none", { defaultValue: "بدون والد" })}
                    </ListItemStandard>

                    {filteredItems.map((item) => (
                        <ListItemStandard
                            key={item.id}
                            selected={item.id === selectedParentId}
                            additionalText={item.code}
                            description={item.parentOrganizationId ?? ""}
                            onClick={() => onSelect(item.id)}
                        >
                            {item.displayLabel || item.code}
                        </ListItemStandard>
                    ))}
                </List>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                    {onConfirm ? (
                        <Button
                            design="Emphasized"
                            disabled={busy || confirmDisabled}
                            onClick={onConfirm}
                        >
                            {t("organization.move.confirm", { defaultValue: "Move" })}
                        </Button>
                    ) : null}
                    <Button design="Transparent" disabled={busy} onClick={onClose}>
                        {t("common.close", { defaultValue: "بستن" })}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
