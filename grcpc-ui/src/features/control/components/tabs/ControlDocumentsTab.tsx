import { useTranslation } from "react-i18next";

import { DocumentManager } from "@/features/document";

export interface ControlDocumentsTabProps {
    controlId: string;
    readOnly?: boolean;
    showActions?: boolean;
}

export default function ControlDocumentsTab({
    controlId,
    readOnly = false,
    showActions = true,
}: ControlDocumentsTabProps) {
    const { t } = useTranslation();

    return (
        <DocumentManager
            title={t("control.tabs.documents", { defaultValue: "مستندات" })}
            targetType="CENTRAL_CONTROL"
            targetId={controlId}
            readOnly={readOnly}
            showActions={showActions}
        />
    );
}
