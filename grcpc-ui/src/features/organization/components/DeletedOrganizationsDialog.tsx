import { Button, BusyIndicator, Dialog, List, ListItemCustom, MessageStrip, Text } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { OrganizationNode } from "../domain/organization.model";

interface DeletedOrganizationsDialogProps {
    open: boolean;
    items: OrganizationNode[];
    busy?: boolean;
    onClose: () => void;
    onRestore: (node: OrganizationNode) => void;
}

export default function DeletedOrganizationsDialog({
    open,
    items,
    busy = false,
    onClose,
    onRestore,
}: DeletedOrganizationsDialogProps) {
    const { t } = useTranslation();
    const title = t("organization.deleted.title", { defaultValue: "Deleted organizations" });

    return (
        <Dialog open={open} accessibleName={title} onClose={onClose} style={{ width: "42rem" }}>
            <ModalDialogHeader title={title} onClose={onClose} />
            <div style={{ display: "grid", gap: "1rem", minWidth: "28rem" }}>
                {busy ? <BusyIndicator active /> : null}
                {!busy && items.length === 0 ? (
                    <MessageStrip design="Information" hideCloseButton>
                        {t("organization.deleted.empty", { defaultValue: "No deleted organization was found." })}
                    </MessageStrip>
                ) : (
                    <List separators="Inner">
                        {items.map((item) => (
                            <ListItemCustom key={item.id}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", width: "100%" }}>
                                    <div style={{ display: "grid", gap: "0.25rem", minWidth: 0 }}>
                                        <strong>{item.code}</strong>
                                        <Text>{item.parentOrganizationId ?? "-"}</Text>
                                    </div>
                                    <Button
                                        design="Emphasized"
                                        disabled={busy}
                                        onClick={() => onRestore(item)}
                                    >
                                        {t("organization.restore.action", { defaultValue: "Restore" })}
                                    </Button>
                                </div>
                            </ListItemCustom>
                        ))}
                    </List>
                )}
            </div>
        </Dialog>
    );
}
