import { useTranslation } from "react-i18next";

import { DocumentAttachmentsManager } from "@/features/document";

export interface ControlDocumentsTabProps {
    controlAssignmentId: string;
}

export default function ControlDocumentsTab({
    controlAssignmentId,
}: ControlDocumentsTabProps) {
    const { t } = useTranslation();

    return (
        <DocumentAttachmentsManager
            title={t("control.tabs.documents", { defaultValue: "مستندات" })}
            targetType="CONTROL_ASSIGNMENT"
            targetId={controlAssignmentId}
        />
    );
}
