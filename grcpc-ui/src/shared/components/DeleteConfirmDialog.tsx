import { Button, Dialog, Text } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";

export interface DeleteConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    onClose: () => void;
    onConfirm: () => void;
    loading?: boolean;
    confirmText?: string;
    cancelText?: string;
}

export function DeleteConfirmDialog({
                                        open,
                                        title,
                                        message,
                                        onClose,
                                        onConfirm,
                                        loading = false,
                                        confirmText,
                                        cancelText,
                                    }: DeleteConfirmDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog
            open={open}
            headerText={title}
            onClose={onClose}
            footer={
                <>
                    <Button design="Negative" onClick={onConfirm} disabled={loading}>
                        {confirmText ?? t("common.delete", { defaultValue: "حذف" })}
                    </Button>
                    <Button design="Transparent" onClick={onClose} disabled={loading}>
                        {cancelText ?? t("common.cancel", { defaultValue: "انصراف" })}
                    </Button>
                </>
            }
        >
            <Text>{message}</Text>
        </Dialog>
    );
}