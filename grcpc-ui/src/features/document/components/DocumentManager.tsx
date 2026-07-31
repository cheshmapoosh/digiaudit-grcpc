import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    FileUploader,
    Input,
    MessageStrip,
    ProgressIndicator,
    Table,
    TableCell,
    TableHeaderCell,
    TableHeaderRow,
    TableRow,
    Text,
    Title,
} from "@ui5/webcomponents-react";

import type {
    DocumentLinkSummary,
    DocumentLinkTargetType,
    DocumentTemporaryUpload,
} from "../domain/document.model";
import { getDocumentTargetKey, useDocumentState } from "../state/document.state";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { formatPersianDate } from "@/shared/utils/date.utils";
import { HttpError } from "@/shared/infra/http.client";

export interface DocumentManagerProps {
    targetType: DocumentLinkTargetType;
    targetId: string | null;
    readOnly?: boolean;
    showActions?: boolean;
    busy?: boolean;
    title?: string;
    saveFirstMessage?: string;
    viewHint?: string;
    editHint?: string;
    onPendingUploadsChange?: (hasPendingUploads: boolean) => void;
}

type UploadFlowState =
    | "SELECTED"
    | "UPLOADING"
    | "AVAILABLE"
    | "FINALIZING"
    | "CONSUMED";

type UploadFailureState =
    | "UPLOAD_FAILED"
    | "FINALIZATION_FAILED"
    | "EXPIRED"
    | "ACCESS_DENIED";

interface UploadFlowItem {
    id: string;
    file?: File;
    fileName: string;
    mimeType?: string | null;
    fileSize: number;
    progress: number;
    state: UploadFlowState;
    failureState?: UploadFailureState;
    tempUploadId?: string;
    expiresAt?: string;
    existingDocument?: DocumentLinkSummary;
    error?: string;
    title: string;
    code: string;
    description: string;
    documentCategoryCode: string;
    validFrom: string;
    validTo: string;
}

type ActionMessageDesign = "Information" | "Positive" | "Negative";

interface ActionMessage {
    design: ActionMessageDesign;
    text: string;
}

const PANEL_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.75rem",
    minHeight: "15rem",
    minWidth: 0,
    background: "var(--sapGroup_ContentBackground)",
    border: "1px solid var(--sapList_BorderColor)",
    padding: "1rem",
};

const HEADER_STYLE: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "flex-start",
    flexWrap: "wrap",
};

const HEADER_TEXT_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.35rem",
    minWidth: 0,
};

const ACTIONS_STYLE: CSSProperties = {
    display: "inline-flex",
    gap: "0.35rem",
    flexWrap: "wrap",
};

const TITLE_INPUT_STYLE: CSSProperties = {
    minWidth: "12rem",
    width: "100%",
};

const UPLOAD_PROGRESS_AREA_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.5rem",
};

const UPLOAD_ITEM_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.5rem",
    padding: "0.75rem",
    border: "1px solid var(--sapList_BorderColor)",
    borderRadius: "0.375rem",
    background: "var(--sapList_Background)",
};

const UPLOAD_ITEM_HEADER_STYLE: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
};

const UPLOAD_ITEM_TITLE_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.15rem",
    minWidth: 0,
};

const UPLOAD_ITEM_NAME_STYLE: CSSProperties = {
    fontWeight: 600,
    overflowWrap: "anywhere",
};

const STAGED_METADATA_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
    gap: "0.5rem",
    alignItems: "end",
};

const META_TEXT_STYLE: CSSProperties = {
    color: "var(--sapContent_LabelColor)",
    fontSize: "0.8125rem",
    overflowWrap: "anywhere",
};

const ERROR_TEXT_STYLE: CSSProperties = {
    color: "var(--sapNegativeTextColor)",
    fontSize: "0.8125rem",
    overflowWrap: "anywhere",
};

const NONE_TEXT = "-";
const SUCCESS_UPLOAD_VISIBLE_MS = 2000;
const FALLBACK_PROGRESS_INTERVAL_MS = 300;
const FALLBACK_PROGRESS_MAX = 90;
const FALLBACK_PROGRESS_STEP = 5;

function createUploadRowId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

function filesFromChangeEvent(event: unknown): File[] {
    const changeEvent = event as {
        detail?: { files?: FileList | null };
        target?: { value?: string };
    };

    if (changeEvent.target) {
        changeEvent.target.value = "";
    }

    return Array.from(changeEvent.detail?.files ?? []);
}

function formatFileSize(sizeBytes?: number): string {
    if (typeof sizeBytes !== "number" || sizeBytes < 0) {
        return NONE_TEXT;
    }

    if (sizeBytes === 0) {
        return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    let size = sizeBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }

    const precision = unitIndex === 0 ? 0 : 1;
    return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function displayText(value?: string | null): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : NONE_TEXT;
}

function normalizeProgress(progress: number | undefined): number {
    if (typeof progress !== "number" || Number.isNaN(progress)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(progress)));
}

function normalizeVisibleProgress(progress: number): number {
    return Math.max(1, normalizeProgress(progress));
}

function isExpired(expiresAt?: string): boolean {
    return Boolean(expiresAt && Date.parse(expiresAt) <= Date.now());
}

function initialTitle(fileName: string): string {
    const withoutExtension = fileName.replace(/\.[^.]+$/, "").trim();
    return withoutExtension || fileName;
}

function optionalText(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function deriveFailureState(error: unknown, expiresAt?: string): UploadFailureState {
    if (isExpired(expiresAt)) {
        return "EXPIRED";
    }

    if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
        return "ACCESS_DENIED";
    }

    return "FINALIZATION_FAILED";
}

function versionStatusText(
    row: DocumentLinkSummary,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (row.linkStatus === "INACTIVE" || row.documentStatus === "INACTIVE" || row.versionStatus === "INACTIVE") {
        return t("document.status.inactive", { defaultValue: "Inactive" });
    }

    if (row.linkStatus === "DELETED" || row.documentStatus === "DELETED" || row.versionStatus === "DELETED") {
        return t("document.status.deleted", { defaultValue: "Deleted" });
    }

    return t("document.status.active", { defaultValue: "Saved" });
}

export default function DocumentManager({
    targetType,
    targetId,
    readOnly = false,
    showActions = true,
    busy = false,
    title,
    saveFirstMessage,
    viewHint,
    editHint,
    onPendingUploadsChange,
}: DocumentManagerProps) {
    const { t } = useTranslation();
    const mountedRef = useRef(true);
    const successTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const progressFallbackTimersRef =
        useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
    const [uploadItems, setUploadItems] = useState<UploadFlowItem[]>([]);
    const [metadataDrafts, setMetadataDrafts] = useState<Record<string, string>>({});
    const [savingMetadataIds, setSavingMetadataIds] = useState<Set<string>>(() => new Set());
    const [versioningDocumentIds, setVersioningDocumentIds] = useState<Set<string>>(() => new Set());
    const [deleteCandidate, setDeleteCandidate] = useState<DocumentLinkSummary | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

    const linkedDocumentsByTarget = useDocumentState((state) => state.linkedDocumentsByTarget);
    const loading = useDocumentState((state) => state.loading);
    const loadForTarget = useDocumentState((state) => state.loadForTarget);
    const uploadTemporary = useDocumentState((state) => state.uploadTemporary);
    const createDocument = useDocumentState((state) => state.createDocument);
    const addVersion = useDocumentState((state) => state.addVersion);
    const updateMetadata = useDocumentState((state) => state.updateMetadata);
    const linkLifecycle = useDocumentState((state) => state.linkLifecycle);
    const createDownloadAccess = useDocumentState((state) => state.createDownloadAccess);

    const targetKey = getDocumentTargetKey(targetType, targetId);
    const rows = useMemo(() => {
        if (!targetKey) {
            return [];
        }

        return (linkedDocumentsByTarget[targetKey] ?? []).filter(
            (row) =>
                row.documentStatus !== "DELETED" &&
                row.versionStatus !== "DELETED" &&
                row.linkStatus !== "DELETED",
        );
    }, [linkedDocumentsByTarget, targetKey]);

    const hasPendingUploads = useMemo(
        () => uploadItems.some((item) => item.state === "UPLOADING" || item.state === "FINALIZING"),
        [uploadItems],
    );

    useEffect(() => {
        mountedRef.current = true;
        const progressFallbackTimers = progressFallbackTimersRef.current;

        return () => {
            mountedRef.current = false;
            successTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
            successTimeoutsRef.current = [];
            progressFallbackTimers.forEach((intervalId) => clearInterval(intervalId));
            progressFallbackTimers.clear();
        };
    }, []);

    useEffect(() => {
        onPendingUploadsChange?.(hasPendingUploads);
    }, [hasPendingUploads, onPendingUploadsChange]);

    useEffect(() => () => {
        onPendingUploadsChange?.(false);
    }, [onPendingUploadsChange]);

    useEffect(() => {
        if (!targetId) {
            return;
        }

        void loadForTarget(targetType, targetId)
            .then(() => setLoadError(null))
            .catch((error: unknown) => {
                setLoadError(
                    error instanceof Error && error.message
                        ? error.message
                        : t("document.errors.load", {
                              defaultValue: "Failed to load documents",
                          }),
                );
            });
    }, [loadForTarget, targetId, targetType, t]);

    const updateUploadItem = useCallback((
        rowId: string,
        patch: Partial<UploadFlowItem>,
    ) => {
        if (!mountedRef.current) {
            return;
        }

        setUploadItems((current) =>
            current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
        );
    }, []);

    const updateStagedField = useCallback((
        rowId: string,
        field: "title" | "code" | "description" | "documentCategoryCode" | "validFrom" | "validTo",
        value: string,
    ) => {
        setUploadItems((current) =>
            current.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
        );
    }, []);

    const clearUploadProgressFallback = useCallback((rowId: string) => {
        const intervalId = progressFallbackTimersRef.current.get(rowId);
        if (!intervalId) {
            return;
        }

        clearInterval(intervalId);
        progressFallbackTimersRef.current.delete(rowId);
    }, []);

    const removeUploadItem = useCallback((rowId: string) => {
        clearUploadProgressFallback(rowId);
        if (!mountedRef.current) {
            return;
        }

        setUploadItems((current) => current.filter((row) => row.id !== rowId));
    }, [clearUploadProgressFallback]);

    const scheduleSuccessfulUploadRemoval = useCallback((rowId: string) => {
        const timeoutId = setTimeout(() => {
            successTimeoutsRef.current = successTimeoutsRef.current.filter(
                (currentTimeoutId) => currentTimeoutId !== timeoutId,
            );
            removeUploadItem(rowId);
        }, SUCCESS_UPLOAD_VISIBLE_MS);

        successTimeoutsRef.current = [...successTimeoutsRef.current, timeoutId];
    }, [removeUploadItem]);

    const startUploadProgressFallback = useCallback((rowId: string) => {
        clearUploadProgressFallback(rowId);

        const intervalId = setInterval(() => {
            if (!mountedRef.current) {
                clearUploadProgressFallback(rowId);
                return;
            }

            setUploadItems((current) =>
                current.map((row) => {
                    if (row.id !== rowId || row.state !== "UPLOADING") {
                        return row;
                    }

                    const currentProgress = normalizeVisibleProgress(row.progress ?? 1);
                    const nextProgress = Math.min(
                        FALLBACK_PROGRESS_MAX,
                        currentProgress + FALLBACK_PROGRESS_STEP,
                    );

                    if (nextProgress <= currentProgress) {
                        return row;
                    }

                    return { ...row, progress: nextProgress };
                }),
            );
        }, FALLBACK_PROGRESS_INTERVAL_MS);

        progressFallbackTimersRef.current.set(rowId, intervalId);
    }, [clearUploadProgressFallback]);

    const finalizeUpload = useCallback(
        async (item: UploadFlowItem, upload: DocumentTemporaryUpload) => {
            if (!targetId) {
                throw new Error(saveFirstMessage ?? t("document.saveFirst", {
                    defaultValue: "Save the item first, then upload documents.",
                }));
            }

            updateUploadItem(item.id, {
                state: "FINALIZING",
                failureState: undefined,
                progress: 100,
                error: undefined,
            });

            if (item.existingDocument) {
                await addVersion(item.existingDocument.documentId, {
                    tempUploadId: upload.tempUploadId,
                    expectedDocumentVersion: item.existingDocument.documentVersion,
                    targetType,
                    targetId,
                    validFrom: optionalText(item.validFrom),
                    validTo: optionalText(item.validTo),
                });
                return;
            }

            const titleValue = item.title.trim();
            if (!titleValue) {
                throw new Error(t("document.errors.titleRequired", {
                    defaultValue: "Document title is required.",
                }));
            }

            await createDocument({
                tempUploadId: upload.tempUploadId,
                code: optionalText(item.code),
                title: titleValue,
                description: optionalText(item.description),
                documentCategoryCode: optionalText(item.documentCategoryCode),
                targetType,
                targetId,
                validFrom: optionalText(item.validFrom),
                validTo: optionalText(item.validTo),
            });
        },
        [
            addVersion,
            createDocument,
            saveFirstMessage,
            targetId,
            targetType,
            t,
            updateUploadItem,
        ],
    );

    const uploadAndFinalize = useCallback(
        async (file: File, existingDocument?: DocumentLinkSummary) => {
            const rowId = createUploadRowId();
            const initialItem: UploadFlowItem = {
                id: rowId,
                file,
                fileName: file.name,
                mimeType: file.type,
                fileSize: file.size,
                progress: 1,
                state: "SELECTED",
                existingDocument,
                title: existingDocument?.title ?? initialTitle(file.name),
                code: existingDocument?.code ?? "",
                description: existingDocument?.description ?? "",
                documentCategoryCode: existingDocument?.documentCategoryCode ?? "",
                validFrom: "",
                validTo: "",
            };

            setUploadItems((current) => [...current, initialItem]);
            setActionMessage(null);
            updateUploadItem(rowId, { state: "UPLOADING" });
            startUploadProgressFallback(rowId);

            let uploadedTemp: DocumentTemporaryUpload | undefined;
            try {
                const upload = await uploadTemporary(file, (progress) => {
                    if (!mountedRef.current) {
                        return;
                    }

                    const nextProgress = Math.min(99, normalizeVisibleProgress(progress));
                    setUploadItems((current) =>
                        current.map((row) => {
                            if (row.id !== rowId || row.state !== "UPLOADING") {
                                return row;
                            }

                            return {
                                ...row,
                                progress: Math.max(row.progress ?? 1, nextProgress),
                            };
                        }),
                    );
                });
                uploadedTemp = upload;
                clearUploadProgressFallback(rowId);

                const availableItem: UploadFlowItem = {
                    ...initialItem,
                    tempUploadId: upload.tempUploadId,
                    expiresAt: upload.expiresAt,
                    progress: 100,
                    state: "AVAILABLE",
                    mimeType: upload.mimeType,
                    fileSize: upload.fileSize,
                };
                updateUploadItem(rowId, availableItem);
                setActionMessage({
                    design: "Positive",
                    text: t("document.upload.staged", {
                        defaultValue: "File \"{{fileName}}\" is uploaded temporarily. Review metadata, then save the document.",
                        fileName: file.name,
                    }),
                });
            } catch (error) {
                clearUploadProgressFallback(rowId);
                const message =
                    error instanceof Error && error.message
                        ? error.message
                        : t("document.errors.upload", {
                              defaultValue: "File upload failed",
                          });

                const failureState = uploadedTemp
                    ? deriveFailureState(error, uploadedTemp.expiresAt)
                    : "UPLOAD_FAILED";

                updateUploadItem(rowId, {
                    progress: 100,
                    state: uploadedTemp ? "AVAILABLE" : "SELECTED",
                    failureState,
                    tempUploadId: uploadedTemp?.tempUploadId,
                    expiresAt: uploadedTemp?.expiresAt,
                    error: message,
                });
                setActionMessage({ design: "Negative", text: message });
            } finally {
                if (existingDocument) {
                    setVersioningDocumentIds((current) => {
                        const next = new Set(current);
                        next.delete(existingDocument.documentId);
                        return next;
                    });
                }
            }
        },
        [
            clearUploadProgressFallback,
            startUploadProgressFallback,
            t,
            updateUploadItem,
            uploadTemporary,
        ],
    );

    const retryFinalization = useCallback(
        async (item: UploadFlowItem) => {
            if (!item.tempUploadId || isExpired(item.expiresAt)) {
                updateUploadItem(item.id, {
                    failureState: "EXPIRED",
                    error: t("document.errors.expired", {
                        defaultValue: "The temporary upload has expired. Upload the file again.",
                    }),
                });
                return;
            }

            const upload: DocumentTemporaryUpload = {
                tempUploadId: item.tempUploadId,
                originalFileName: item.fileName,
                mimeType: item.mimeType,
                fileSize: item.fileSize,
                uploadStatus: "AVAILABLE",
                uploadedAt: "",
                expiresAt: item.expiresAt ?? "",
                version: 0,
            };

            try {
                setActionMessage(null);
                await finalizeUpload(item, upload);
                updateUploadItem(item.id, {
                    state: "CONSUMED",
                    failureState: undefined,
                    error: undefined,
                });
                setActionMessage({
                    design: "Positive",
                    text: t("document.upload.finalized", {
                        defaultValue: "Document was saved successfully.",
                    }),
                });
                scheduleSuccessfulUploadRemoval(item.id);
            } catch (error) {
                const message =
                    error instanceof Error && error.message
                        ? error.message
                        : t("document.errors.finalize", {
                              defaultValue: "Document finalization failed.",
                          });
                updateUploadItem(item.id, {
                    state: "AVAILABLE",
                    failureState: deriveFailureState(error, item.expiresAt),
                    error: message,
                });
                setActionMessage({ design: "Negative", text: message });
            }
        },
        [finalizeUpload, scheduleSuccessfulUploadRemoval, t, updateUploadItem],
    );

    const handleDocumentFilesChange = (event: unknown) => {
        filesFromChangeEvent(event).forEach((file) => {
            void uploadAndFinalize(file);
        });
    };

    const handleVersionFilesChange = (row: DocumentLinkSummary, event: unknown) => {
        const files = filesFromChangeEvent(event);
        if (files.length === 0) {
            return;
        }

        setVersioningDocumentIds((current) => new Set(current).add(row.documentId));
        void uploadAndFinalize(files[0], row);
    };

    const getDraftTitle = useCallback(
        (row: DocumentLinkSummary) => metadataDrafts[row.documentId] ?? row.title,
        [metadataDrafts],
    );

    const hasTitleChange = useCallback(
        (row: DocumentLinkSummary): boolean => {
            const draft = metadataDrafts[row.documentId];
            return Boolean(draft?.trim() && draft.trim() !== row.title);
        },
        [metadataDrafts],
    );

    const handleSaveMetadata = useCallback(
        async (row: DocumentLinkSummary) => {
            if (!targetId || readOnly || !hasTitleChange(row)) {
                return;
            }

            const nextTitle = getDraftTitle(row).trim();
            setSavingMetadataIds((current) => new Set(current).add(row.documentId));
            setActionMessage(null);

            try {
                await updateMetadata(row.documentId, {
                    expectedVersion: row.documentVersion,
                    targetType,
                    targetId,
                    title: nextTitle,
                });
                setMetadataDrafts((current) => {
                    const next = { ...current };
                    delete next[row.documentId];
                    return next;
                });
                setActionMessage({
                    design: "Positive",
                    text: t("document.titleSave.success", {
                        defaultValue: "Document title saved successfully.",
                    }),
                });
            } catch (error) {
                setActionMessage({
                    design: "Negative",
                    text:
                        error instanceof Error && error.message
                            ? error.message
                            : t("document.errors.updateTitle", {
                                  defaultValue: "Failed to save document title",
                              }),
                });
            } finally {
                setSavingMetadataIds((current) => {
                    const next = new Set(current);
                    next.delete(row.documentId);
                    return next;
                });
            }
        },
        [
            getDraftTitle,
            hasTitleChange,
            readOnly,
            t,
            targetId,
            targetType,
            updateMetadata,
        ],
    );

    const handleDownload = useCallback(
        async (row: DocumentLinkSummary) => {
            setActionMessage(null);
            try {
                const response = await createDownloadAccess(row.documentVersionId);
                window.open(response.downloadUrl, "_blank", "noopener,noreferrer");
            } catch (error) {
                setActionMessage({
                    design: "Negative",
                    text:
                        error instanceof Error && error.message
                            ? error.message
                            : t("document.errors.download", {
                                  defaultValue: "Failed to prepare document download",
                              }),
                });
            }
        },
        [createDownloadAccess, t],
    );

    const confirmLinkDelete = async () => {
        if (!deleteCandidate) {
            return;
        }

        try {
            await linkLifecycle(deleteCandidate.documentLinkId, "delete", {
                expectedVersion: deleteCandidate.linkVersion,
            });
            setDeleteCandidate(null);
            setActionMessage({
                design: "Positive",
                text: t("document.delete.success", {
                    defaultValue: "Document link was removed.",
                }),
            });
        } catch (error) {
            setActionMessage({
                design: "Negative",
                text:
                    error instanceof Error && error.message
                        ? error.message
                        : t("document.errors.delete", {
                              defaultValue: "Failed to delete document",
                          }),
            });
        }
    };

    const renderDocumentTitleControl = (row: DocumentLinkSummary) => {
        const titleValue = getDraftTitle(row);

        if (readOnly || !showActions) {
            return titleValue;
        }

        return (
            <Input
                accessibleName={t("document.fields.title", { defaultValue: "Title" })}
                value={titleValue}
                maxlength={255}
                disabled={busy}
                style={TITLE_INPUT_STYLE}
                onInput={(event) => {
                    const nextTitle = readInputValue(event);
                    setMetadataDrafts((current) => ({
                        ...current,
                        [row.documentId]: nextTitle,
                    }));
                }}
            />
        );
    };

    const renderRowActions = (row: DocumentLinkSummary) => {
        if (!showActions) {
            return null;
        }

        const savingTitle = savingMetadataIds.has(row.documentId);
        const versioning = versioningDocumentIds.has(row.documentId);
        const saveTitleDisabled =
            busy ||
            savingTitle ||
            readOnly ||
            !hasTitleChange(row) ||
            !getDraftTitle(row).trim();

        return (
            <div style={ACTIONS_STYLE}>
                {!readOnly ? (
                    <Button
                        design="Transparent"
                        icon="save"
                        tooltip={t("document.actions.saveTitle", { defaultValue: "Save" })}
                        disabled={saveTitleDisabled}
                        onClick={() => {
                            void handleSaveMetadata(row);
                        }}
                    />
                ) : null}

                <Button
                    design="Transparent"
                    icon="download"
                    tooltip={t("document.actions.download", { defaultValue: "Download" })}
                    disabled={busy}
                    onClick={() => {
                        void handleDownload(row);
                    }}
                />

                {!readOnly ? (
                    <FileUploader
                        hideInput
                        disabled={busy || versioning}
                        onChange={(event) => handleVersionFilesChange(row, event)}
                    >
                        <Button
                            design="Transparent"
                            icon="upload"
                            tooltip={t("document.actions.addVersion", {
                                defaultValue: "Add Version",
                            })}
                            disabled={busy || versioning}
                        />
                    </FileUploader>
                ) : null}

                {!readOnly ? (
                    <Button
                        design="Transparent"
                        icon="delete"
                        tooltip={t("document.actions.delete", { defaultValue: "Delete" })}
                        disabled={busy}
                        onClick={() => setDeleteCandidate(row)}
                    />
                ) : null}
            </div>
        );
    };

    const renderUploadStatusText = (item: UploadFlowItem): string => {
        if (item.failureState === "EXPIRED") {
            return t("document.upload.expired", {
                defaultValue: "Temporary upload expired",
            });
        }

        if (item.failureState === "ACCESS_DENIED") {
            return t("document.upload.accessDenied", {
                defaultValue: "Access denied",
            });
        }

        if (item.failureState === "UPLOAD_FAILED") {
            return t("document.upload.failed", { defaultValue: "Upload failed" });
        }

        if (item.failureState === "FINALIZATION_FAILED") {
            return t("document.upload.finalizeFailed", {
                defaultValue: "Finalization failed",
            });
        }

        if (item.state === "CONSUMED") {
            return t("document.upload.consumed", {
                defaultValue: "Document saved",
            });
        }

        if (item.state === "FINALIZING") {
            return t("document.upload.finalizing", {
                defaultValue: "Saving document",
            });
        }

        if (item.state === "AVAILABLE") {
            return t("document.upload.available", {
                defaultValue: "Temporary upload is available",
            });
        }

        const progress = normalizeProgress(item.progress);
        if (progress > 0) {
            return t("document.upload.fileProgress", {
                defaultValue: "Uploading {{progress}}%",
                progress,
            });
        }

        return t("document.upload.fileInProgress", {
            defaultValue: "Uploading",
        });
    };

    const renderUploadProgressArea = () => {
        if (!showActions || uploadItems.length === 0) {
            return null;
        }

        return (
            <div style={UPLOAD_PROGRESS_AREA_STYLE}>
                {uploadItems.map((item) => {
                    const progress = normalizeVisibleProgress(item.progress);
                    const progressValue =
                        item.state === "CONSUMED" || item.failureState ? 100 : progress;
                    const statusText = renderUploadStatusText(item);
                    const staged =
                        item.state === "AVAILABLE" &&
                        Boolean(item.tempUploadId) &&
                        !isExpired(item.expiresAt) &&
                        item.failureState !== "UPLOAD_FAILED" &&
                        item.failureState !== "EXPIRED";
                    const titleMissing = !item.existingDocument && !item.title.trim();
                    const canFinalize =
                        staged &&
                        Boolean(targetId) &&
                        !busy &&
                        !readOnly &&
                        !titleMissing;
                    const showMetadata =
                        item.state === "AVAILABLE" ||
                        item.state === "FINALIZING" ||
                        item.failureState === "FINALIZATION_FAILED";
                    const finalizeText = item.failureState === "FINALIZATION_FAILED"
                        ? t("document.upload.retryFinalize", { defaultValue: "Retry" })
                        : t("document.actions.finalize", { defaultValue: "Save Document" });

                    return (
                        <div key={item.id} style={UPLOAD_ITEM_STYLE}>
                            <div style={UPLOAD_ITEM_HEADER_STYLE}>
                                <div style={UPLOAD_ITEM_TITLE_STYLE}>
                                    <span style={UPLOAD_ITEM_NAME_STYLE}>
                                        {item.fileName}
                                    </span>
                                    <span style={META_TEXT_STYLE}>
                                        {formatFileSize(item.fileSize)}
                                    </span>
                                </div>
                                <div style={ACTIONS_STYLE}>
                                    {showMetadata ? (
                                        <Button
                                            design="Emphasized"
                                            icon="save"
                                            disabled={!canFinalize}
                                            tooltip={
                                                targetId
                                                    ? undefined
                                                    : saveFirstText
                                            }
                                            onClick={() => {
                                                void retryFinalization(item);
                                            }}
                                        >
                                            {finalizeText}
                                        </Button>
                                    ) : null}
                                    {item.failureState || item.state === "CONSUMED" ? (
                                        <Button
                                            design="Transparent"
                                            onClick={() => removeUploadItem(item.id)}
                                        >
                                            {t("document.upload.removeFailed", {
                                                defaultValue: "Delete",
                                            })}
                                        </Button>
                                    ) : null}
                                </div>
                            </div>

                            {showMetadata ? (
                                <div style={STAGED_METADATA_STYLE}>
                                    {!item.existingDocument ? (
                                        <>
                                            <Input
                                                accessibleName={t("document.fields.title", {
                                                    defaultValue: "Title",
                                                })}
                                                placeholder={t("document.fields.title", {
                                                    defaultValue: "Title",
                                                })}
                                                value={item.title}
                                                maxlength={255}
                                                disabled={busy || item.state === "FINALIZING"}
                                                valueState={titleMissing ? "Negative" : "None"}
                                                onInput={(event) =>
                                                    updateStagedField(item.id, "title", readInputValue(event))
                                                }
                                            />
                                            <Input
                                                accessibleName={t("document.fields.code", {
                                                    defaultValue: "Code",
                                                })}
                                                placeholder={t("document.fields.code", {
                                                    defaultValue: "Code",
                                                })}
                                                value={item.code}
                                                maxlength={64}
                                                disabled={busy || item.state === "FINALIZING"}
                                                onInput={(event) =>
                                                    updateStagedField(item.id, "code", readInputValue(event))
                                                }
                                            />
                                            <Input
                                                accessibleName={t("document.fields.category", {
                                                    defaultValue: "Category",
                                                })}
                                                placeholder={t("document.fields.category", {
                                                    defaultValue: "Category",
                                                })}
                                                value={item.documentCategoryCode}
                                                maxlength={64}
                                                disabled={busy || item.state === "FINALIZING"}
                                                onInput={(event) =>
                                                    updateStagedField(item.id, "documentCategoryCode", readInputValue(event))
                                                }
                                            />
                                            <Input
                                                accessibleName={t("document.fields.description", {
                                                    defaultValue: "Description",
                                                })}
                                                placeholder={t("document.fields.description", {
                                                    defaultValue: "Description",
                                                })}
                                                value={item.description}
                                                maxlength={1000}
                                                disabled={busy || item.state === "FINALIZING"}
                                                onInput={(event) =>
                                                    updateStagedField(item.id, "description", readInputValue(event))
                                                }
                                            />
                                        </>
                                    ) : null}
                                    <Input
                                        accessibleName={t("document.fields.validFrom", {
                                            defaultValue: "Valid From",
                                        })}
                                        placeholder={t("document.fields.validFrom", {
                                            defaultValue: "Valid From",
                                        })}
                                        value={item.validFrom}
                                        maxlength={10}
                                        disabled={busy || item.state === "FINALIZING"}
                                        onInput={(event) =>
                                            updateStagedField(item.id, "validFrom", readInputValue(event))
                                        }
                                    />
                                    <Input
                                        accessibleName={t("document.fields.validTo", {
                                            defaultValue: "Valid To",
                                        })}
                                        placeholder={t("document.fields.validTo", {
                                            defaultValue: "Valid To",
                                        })}
                                        value={item.validTo}
                                        maxlength={10}
                                        disabled={busy || item.state === "FINALIZING"}
                                        onInput={(event) =>
                                            updateStagedField(item.id, "validTo", readInputValue(event))
                                        }
                                    />
                                </div>
                            ) : null}

                            <ProgressIndicator
                                accessibleName={statusText}
                                displayValue={
                                    item.state === "CONSUMED"
                                        ? "100%"
                                        : item.state === "UPLOADING"
                                          ? `${progress}%`
                                          : ""
                                }
                                hideValue={item.state !== "UPLOADING" && item.state !== "CONSUMED"}
                                value={progressValue}
                                valueState={
                                    item.failureState
                                        ? "Negative"
                                        : item.state === "CONSUMED"
                                          ? "Positive"
                                          : "Information"
                                }
                            />

                            <span style={item.failureState ? ERROR_TEXT_STYLE : META_TEXT_STYLE}>
                                {statusText}
                                {item.error ? ` - ${item.error}` : ""}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const documentTitle = title ?? t("document.title", { defaultValue: "Documents" });
    const documentHint = readOnly
        ? viewHint
        : editHint ?? t("document.editHint", {
              defaultValue: "Select a file to add a document.",
          });
    const saveFirstText = saveFirstMessage ?? t("document.saveFirst", {
        defaultValue: "Save the item first, then finalize uploaded documents.",
    });
    const canUploadDocuments = showActions && !readOnly && !busy;
    const activeBusy = busy || loading;
    const noDataText = t("document.empty", {
        defaultValue: "No document has been added.",
    });

    return (
        <div style={PANEL_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TEXT_STYLE}>
                    <Title level="H5">{documentTitle}</Title>
                    {documentHint ? <Text>{documentHint}</Text> : null}
                </div>

                {!readOnly && showActions ? (
                    <FileUploader
                        hideInput
                        multiple
                        disabled={!canUploadDocuments}
                        onChange={handleDocumentFilesChange}
                    >
                        <Button
                            design="Emphasized"
                            icon="upload"
                            disabled={!canUploadDocuments}
                        >
                            {t("document.actions.upload", { defaultValue: "Select File" })}
                        </Button>
                    </FileUploader>
                ) : null}
            </div>

            {!readOnly && showActions && !targetId ? (
                <MessageStrip design="Information" hideCloseButton>
                    {saveFirstText}
                </MessageStrip>
            ) : null}

            {loadError ? (
                <MessageStrip
                    design="Negative"
                    hideCloseButton={!showActions}
                    onClose={showActions ? () => setLoadError(null) : undefined}
                >
                    {loadError}
                </MessageStrip>
            ) : null}

            {actionMessage ? (
                <MessageStrip
                    design={actionMessage.design}
                    hideCloseButton={!showActions}
                    onClose={showActions ? () => setActionMessage(null) : undefined}
                >
                    {actionMessage.text}
                </MessageStrip>
            ) : null}

            {renderUploadProgressArea()}

            <Table
                accessibleName={documentTitle}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell minWidth="12rem">
                            {t("document.fields.title", { defaultValue: "Title" })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("document.fields.fileName", { defaultValue: "File Name" })}
                        </TableHeaderCell>
                        <TableHeaderCell width="6rem">
                            {t("document.fields.version", { defaultValue: "Version" })}
                        </TableHeaderCell>
                        <TableHeaderCell width="10rem">
                            {t("document.fields.mimeType", { defaultValue: "File Type" })}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("document.fields.size", { defaultValue: "Size" })}
                        </TableHeaderCell>
                        <TableHeaderCell width="10rem">
                            {t("document.fields.status", { defaultValue: "Status" })}
                        </TableHeaderCell>
                        <TableHeaderCell width="10rem">
                            {t("document.fields.uploadedAt", { defaultValue: "Uploaded At" })}
                        </TableHeaderCell>
                        {showActions ? (
                            <TableHeaderCell width="10rem">
                                {t("document.fields.actions", { defaultValue: "Actions" })}
                            </TableHeaderCell>
                        ) : null}
                    </TableHeaderRow>
                }
                loading={activeBusy}
                loadingDelay={0}
                noDataText={noDataText}
                overflowMode="Popin"
            >
                {rows.map((row) => (
                    <TableRow key={row.documentLinkId} rowKey={row.documentLinkId}>
                        <TableCell>{renderDocumentTitleControl(row)}</TableCell>
                        <TableCell>{row.fileName}</TableCell>
                        <TableCell>{row.documentVersionNumber}</TableCell>
                        <TableCell>{displayText(row.mimeType)}</TableCell>
                        <TableCell>{formatFileSize(row.fileSize)}</TableCell>
                        <TableCell>{versionStatusText(row, t)}</TableCell>
                        <TableCell>
                            {row.uploadedAt ? formatPersianDate(row.uploadedAt) : NONE_TEXT}
                        </TableCell>
                        {showActions ? (
                            <TableCell>{renderRowActions(row)}</TableCell>
                        ) : null}
                    </TableRow>
                ))}
            </Table>

            {showActions ? (
                <DeleteConfirmDialog
                    open={Boolean(deleteCandidate)}
                    title={t("document.delete.title", { defaultValue: "Delete Document" })}
                    message={t("document.delete.confirm", {
                        defaultValue: "Remove document \"{{title}}\" from this item?",
                        title: deleteCandidate?.title ?? "",
                    })}
                    confirmText={t("document.actions.delete", { defaultValue: "Delete" })}
                    cancelText={t("common.cancel", { defaultValue: "Cancel" })}
                    loading={activeBusy}
                    onClose={() => setDeleteCandidate(null)}
                    onConfirm={() => {
                        void confirmLinkDelete();
                    }}
                />
            ) : null}
        </div>
    );
}
