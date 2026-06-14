import { useTranslation } from "react-i18next";

import {
    DocumentAttachmentsManager,
    type DocumentBeforeParentSubmitHandler,
} from "@/features/document";

export interface ControlDocumentsTabProps {
    controlAssignmentId: string;
    tempSessionId?: string;
    readOnly?: boolean;
    onBeforeParentSubmitChange?: (
        handler: DocumentBeforeParentSubmitHandler | null,
    ) => void;
    onPendingUploadsChange?: (hasPendingUploads: boolean) => void;
}

export default function ControlDocumentsTab({
    controlAssignmentId,
    tempSessionId,
    readOnly = false,
    onBeforeParentSubmitChange,
    onPendingUploadsChange,
}: ControlDocumentsTabProps) {
    const { t } = useTranslation();

    return (
        <DocumentAttachmentsManager
            title={t("control.tabs.documents", { defaultValue: "مستندات" })}
            targetType="CONTROL_ASSIGNMENT"
            targetId={controlAssignmentId}
            tempSessionId={tempSessionId}
            stagingMode="tempUntilParentSave"
            readOnly={readOnly}
            onBeforeParentSubmitChange={onBeforeParentSubmitChange}
            onPendingUploadsChange={onPendingUploadsChange}
        />
    );
}
