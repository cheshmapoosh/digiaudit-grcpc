import { Dialog, Button, Text } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";

export function DeleteConfirmDialog({
                                        open,
                                        title,
                                        message,
                                        onCancel,
                                        onConfirm,
                                        busy
                                    }: {
    open: boolean;
    title: string;
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
    busy?: boolean;
}) {
    const { t } = useTranslation();

    return (
        <Dialog
            open={open}
            headerText={title}
            onAfterClose={onCancel}
            footer={
                <>
                    <Button design="Negative" onClick={onConfirm} disabled={!!busy}>
                        {t("common.delete", "حذف")}
                    </Button>
                    <Button design="Transparent" onClick={onCancel} disabled={!!busy}>
                        {t("common.cancel", "انصراف")}
                    </Button>
                </>
            }
        >
            <Text>{message}</Text>
        </Dialog>
    );
}
