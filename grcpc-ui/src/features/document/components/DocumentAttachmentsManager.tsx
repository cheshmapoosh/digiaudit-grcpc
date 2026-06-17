import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import DocumentAttachmentsTab, {
    type DocumentBeforeParentSubmitHandler,
} from "./DocumentAttachmentsTab";
import type { DocumentAttachment } from "../domain/document.model";
import { useDocumentAttachmentState } from "../state/document-attachment.state";

export interface DocumentAttachmentsManagerProps {
    targetType: string;
    targetId: string | null;
    tempSessionId?: string;
    stagingMode?: "tempUntilParentSave" | "direct";
    readOnly?: boolean;
    showActions?: boolean;
    busy?: boolean;
    title?: string;
    saveFirstMessage?: string;
    viewHint?: string;
    editHint?: string;
    onBeforeParentSubmitChange?: (
        handler: DocumentBeforeParentSubmitHandler | null,
    ) => void;
    onPendingUploadsChange?: (hasPendingUploads: boolean) => void;
}

const EMPTY_DOCUMENTS: DocumentAttachment[] = [];

function targetKey(targetType: string, targetId: string): string {
    return `${targetType}:${targetId}`;
}

function mapDocumentError(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

export default function DocumentAttachmentsManager({
    targetType,
    targetId,
    tempSessionId,
    stagingMode = "direct",
    readOnly = false,
    showActions = true,
    busy = false,
    title,
    saveFirstMessage,
    viewHint,
    editHint,
    onBeforeParentSubmitChange,
    onPendingUploadsChange,
}: DocumentAttachmentsManagerProps) {
    const { t } = useTranslation();
    const [loadError, setLoadError] = useState<string | null>(null);
    const useTempUpload = stagingMode === "tempUntilParentSave";
    const documentsByTarget = useDocumentAttachmentState((state) => state.documentsByTarget);
    const tempDocumentsBySession = useDocumentAttachmentState(
        (state) => state.tempDocumentsBySession,
    );
    const uploadPoliciesByTargetType = useDocumentAttachmentState(
        (state) => state.uploadPoliciesByTargetType,
    );
    const loading = useDocumentAttachmentState((state) => state.loading);
    const loadForTarget = useDocumentAttachmentState((state) => state.loadForTarget);
    const loadTemp = useDocumentAttachmentState((state) => state.loadTemp);
    const loadUploadPolicy = useDocumentAttachmentState((state) => state.loadUploadPolicy);
    const uploadDocument = useDocumentAttachmentState((state) => state.upload);
    const uploadTempDocument = useDocumentAttachmentState((state) => state.uploadTemp);
    const updateTitle = useDocumentAttachmentState((state) => state.updateTitle);
    const deleteDocument = useDocumentAttachmentState((state) => state.deleteDocument);
    const createDownloadUrl = useDocumentAttachmentState((state) => state.createDownloadUrl);

    useEffect(() => {
        if (!showActions || readOnly) {
            return;
        }

        void loadUploadPolicy(targetType)
            .then(() => setLoadError(null))
            .catch((error: unknown) => {
                setLoadError(
                    mapDocumentError(
                        error,
                        t("document.errors.loadPolicy", {
                            defaultValue:
                                "خطا در بارگذاری تنظیمات آپلود مستندات",
                        }),
                    ),
                );
            });
    }, [loadUploadPolicy, readOnly, showActions, targetType, t]);

    useEffect(() => {
        if (!targetId) {
            return;
        }

        void loadForTarget(targetType, targetId)
            .then(() => setLoadError(null))
            .catch((error: unknown) => {
                setLoadError(
                    mapDocumentError(
                        error,
                        t("document.errors.load", {
                            defaultValue: "خطا در بارگذاری مستندات",
                        }),
                    ),
                );
            });
    }, [loadForTarget, targetId, targetType, t]);

    useEffect(() => {
        if (!tempSessionId) {
            return;
        }

        void loadTemp(targetType, tempSessionId)
            .then(() => setLoadError(null))
            .catch((error: unknown) => {
                setLoadError(
                    mapDocumentError(
                        error,
                        t("document.errors.load", {
                            defaultValue: "خطا در بارگذاری مستندات",
                        }),
                    ),
                );
            });
    }, [loadTemp, targetType, tempSessionId, t]);

    const documents = targetId
        ? documentsByTarget[targetKey(targetType, targetId)] ?? EMPTY_DOCUMENTS
        : EMPTY_DOCUMENTS;
    const tempDocuments = tempSessionId
        ? tempDocumentsBySession[tempSessionId] ?? EMPTY_DOCUMENTS
        : EMPTY_DOCUMENTS;
    const uploadPolicy = uploadPoliciesByTargetType[targetType];

    const handleUploadDocument = useCallback(
        async (file: File, onProgress?: (progress: number) => void) => {
            if (useTempUpload) {
                if (!tempSessionId) {
                    throw new Error(
                        t("document.errors.missingTempSession", {
                            defaultValue: "نشست موقت بارگذاری مستندات آماده نیست.",
                        }),
                    );
                }

                await uploadTempDocument(
                    {
                        targetType,
                        tempSessionId,
                        targetId: targetId ?? null,
                        title: file.name,
                        file,
                    },
                    onProgress,
                );
                return;
            }

            if (targetId) {
                await uploadDocument(
                    {
                        targetType,
                        targetId,
                        title: file.name,
                        file,
                    },
                    onProgress,
                );
                return;
            }

            throw new Error(
                saveFirstMessage ?? t("document.saveFirst", {
                    defaultValue:
                        "ابتدا آیتم را ذخیره کنید، سپس مستندات را بارگذاری کنید.",
                }),
            );
        },
        [
            saveFirstMessage,
            t,
            targetId,
            targetType,
            tempSessionId,
            useTempUpload,
            uploadDocument,
            uploadTempDocument,
        ],
    );

    const handleDownloadDocument = useCallback(
        async (documentId: string) => {
            const url = await createDownloadUrl(documentId);
            window.open(url, "_blank", "noopener,noreferrer");
        },
        [createDownloadUrl],
    );

    const handleUpdateDocumentTitle = useCallback(
        async (documentId: string, title: string) => {
            await updateTitle(documentId, title);
        },
        [updateTitle],
    );

    return (
        <DocumentAttachmentsTab
            title={title}
            targetType={targetType}
            targetId={targetId}
            tempSessionId={tempSessionId}
            documents={documents}
            tempDocuments={tempDocuments}
            uploadPolicy={uploadPolicy}
            busy={busy || loading}
            readOnly={readOnly}
            showActions={showActions}
            uploadRequiresTempSession={useTempUpload}
            error={loadError}
            saveFirstMessage={saveFirstMessage}
            tempSessionMissingMessage={t("document.errors.missingTempSession", {
                defaultValue: "نشست موقت بارگذاری مستندات آماده نیست.",
            })}
            viewHint={viewHint}
            editHint={editHint}
            onUploadDocument={showActions ? handleUploadDocument : undefined}
            onUpdateDocumentTitle={showActions ? handleUpdateDocumentTitle : undefined}
            onDeleteDocument={showActions ? deleteDocument : undefined}
            onDownloadDocument={showActions ? handleDownloadDocument : undefined}
            onErrorClose={showActions ? () => setLoadError(null) : undefined}
            onBeforeParentSubmitChange={onBeforeParentSubmitChange}
            onPendingUploadsChange={onPendingUploadsChange}
        />
    );
}
