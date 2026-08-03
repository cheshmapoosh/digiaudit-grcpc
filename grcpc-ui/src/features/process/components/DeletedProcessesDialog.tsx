import { Button, BusyIndicator, Dialog, List, ListItemCustom, MessageStrip, Text } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { ProcessNode } from "../domain/process.model";

interface DeletedProcessesDialogProps {
    open: boolean;
    items: ProcessNode[];
    busy?: boolean;
    onClose: () => void;
    onRestore: (node: ProcessNode) => void;
}

export default function DeletedProcessesDialog({
    open,
    items,
    busy = false,
    onClose,
    onRestore,
}: DeletedProcessesDialogProps) {
    const { t } = useTranslation();
    const title = t("process.deleted.title", { defaultValue: "Deleted processes and subprocesses" });

    return (
        <Dialog open={open} accessibleName={title} onClose={onClose} style={{ width: "46rem" }}>
            <ModalDialogHeader title={title} onClose={onClose} />
            <div style={{ display: "grid", gap: "1rem", minWidth: "30rem" }}>
                {busy ? <BusyIndicator active /> : null}
                {!busy && items.length === 0 ? (
                    <MessageStrip design="Information" hideCloseButton>
                        {t("process.deleted.empty", { defaultValue: "No deleted item was found." })}
                    </MessageStrip>
                ) : (
                    <List separators="Inner">
                        {items.map((item) => (
                            <ListItemCustom key={`${item.nodeType}:${item.id}`}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", width: "100%" }}>
                                    <div style={{ display: "grid", gap: "0.25rem", minWidth: 0 }}>
                                        <strong>{item.title}</strong>
                                        <Text>{item.code} - {item.nodeType}</Text>
                                        <Text>{item.parentId ?? "-"}</Text>
                                    </div>
                                    <Button
                                        design="Emphasized"
                                        disabled={busy}
                                        onClick={() => onRestore(item)}
                                    >
                                        {t("process.restore.action", { defaultValue: "Restore" })}
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
