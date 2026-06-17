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
    DocumentAttachment,
    DocumentUploadPolicy,
} from "../domain/document.model";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { HttpError } from "@/shared/infra/http.client";
import { formatPersianDate } from "@/shared/utils/date.utils";

export type DocumentBeforeParentSubmitHandler = () => Promise<boolean>;

export interface DocumentAttachmentsTabProps {
    title?: string;
    targetType: string;
    targetId: string | null;
    tempSessionId?: string;
    documents: DocumentAttachment[];
    tempDocuments?: DocumentAttachment[];
    uploadPolicy?: DocumentUploadPolicy;
    busy?: boolean;
    readOnly?: boolean;
    showActions?: boolean;
    uploadRequiresTempSession?: boolean;
    error?: string | null;
    saveFirstMessage?: string;
    tempSessionMissingMessage?: string;
    viewHint?: string;
    editHint?: string;
    onUploadDocument?: (
        file: File,
        onProgress?: (progress: number) => void,
    ) => Promise<void> | void;
    onUpdateDocumentTitle?: (documentId: string, title: string) => Promise<void> | void;
    onDeleteDocument?: (documentId: string) => Promise<void> | void;
    onDownloadDocument?: (documentId: string) => Promise<void> | void;
    onErrorClose?: () => void;
    onBeforeParentSubmitChange?: (
        handler: DocumentBeforeParentSubmitHandler | null,
    ) => void;
    onPendingUploadsChange?: (hasPendingUploads: boolean) => void;
}

type UploadItemState = "uploading" | "success" | "error";
type DocumentActionMessageDesign = "Positive" | "Negative";

interface DocumentUploadItem {
    id: string;
    fileName: string;
    contentType?: string;
    sizeBytes: number;
    progress?: number;
    state: UploadItemState;
    error?: string;
}

interface DocumentActionMessage {
    design: DocumentActionMessageDesign;
    text: string;
}

const PANEL_STYLE: CSSProperties = {
    minHeight: "15rem",
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
};

const ACTIONS_STYLE: CSSProperties = {
    display: "inline-flex",
    gap: "0.5rem",
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

const UPLOAD_ITEM_META_STYLE: CSSProperties = {
    color: "var(--sapContent_LabelColor)",
    fontSize: "0.8125rem",
};

const UPLOAD_ITEM_ERROR_STYLE: CSSProperties = {
    color: "var(--sapNegativeTextColor)",
    fontSize: "0.8125rem",
    overflowWrap: "anywhere",
};

const TABLE_SPACER_STYLE: CSSProperties = {
    height: "0.75rem",
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

function formatFileSize(sizeBytes?: number): string {
    if (!sizeBytes || sizeBytes <= 0) {
        return NONE_TEXT;
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

function formatDocumentUploadedAt(value?: string): string {
    return value ? formatPersianDate(value) : NONE_TEXT;
}

function resolveDocumentTitle(documentItem: DocumentAttachment): string {
    return documentItem.title?.trim() || documentItem.originalFileName;
}

function normalizeDocumentTitleInput(value: string, fallback: string): string {
    const normalized = value.trim();
    return normalized || fallback;
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

export default function DocumentAttachmentsTab({
    title,
    targetId,
    tempSessionId,
    documents,
    tempDocuments = [],
    uploadPolicy,
    busy = false,
    readOnly = false,
    showActions = true,
    uploadRequiresTempSession = false,
    error,
    saveFirstMessage,
    tempSessionMissingMessage,
    viewHint,
    editHint,
    onUploadDocument,
    onUpdateDocumentTitle,
    onDeleteDocument,
    onDownloadDocument,
    onErrorClose,
    onBeforeParentSubmitChange,
    onPendingUploadsChange,
}: DocumentAttachmentsTabProps) {
    const { t } = useTranslation();
    const mountedRef = useRef(true);
    const successTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const progressFallbackTimersRef =
        useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
    const [uploadItems, setUploadItems] = useState<DocumentUploadItem[]>([]);
    const [documentTitleDrafts, setDocumentTitleDrafts] = useState<Record<string, string>>({});
    const [savingTitleIds, setSavingTitleIds] = useState<Set<string>>(() => new Set());
    const [documentDeleteCandidate, setDocumentDeleteCandidate] =
        useState<DocumentAttachment | null>(null);
    const [actionMessage, setActionMessage] = useState<DocumentActionMessage | null>(null);

    useEffect(() => {
        // React StrictMode runs effect cleanup and setup twice in development.
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            successTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
            successTimeoutsRef.current = [];
            progressFallbackTimersRef.current.forEach((intervalId) => clearInterval(intervalId));
            progressFallbackTimersRef.current.clear();
        };
    }, []);

    const documentTitle = title ?? t("document.title", { defaultValue: "مستندات" });
    const documentHint = readOnly
        ? viewHint
        : editHint ?? t("document.editHint", {
              defaultValue: "برای افزودن مستند، فایل را انتخاب کنید.",
          });
    const maxFileSizeText = uploadPolicy?.maxFileSizeMb
        ? t("document.maxFileSize", {
              defaultValue: "حداکثر حجم هر فایل: {{size}} مگابایت",
              size: uploadPolicy.maxFileSizeMb,
          })
        : t("document.maxFileSizeUnknown", {
              defaultValue: "حداکثر حجم فایل از تنظیمات سامانه خوانده می‌شود.",
          });
    const noDataText = t("document.empty", {
        defaultValue: "مستندی ثبت نشده است.",
    });
    const saveFirstText = saveFirstMessage ?? t("document.saveFirst", {
        defaultValue: "ابتدا آیتم را ذخیره کنید، سپس مستندات را بارگذاری کنید.",
    });
    const missingTempSessionText = tempSessionMissingMessage ?? t("document.errors.missingTempSession", {
        defaultValue: "نشست موقت بارگذاری مستندات آماده نیست.",
    });
    const targetUnavailableText = uploadRequiresTempSession
        ? missingTempSessionText
        : saveFirstText;
    const canAddressTarget = uploadRequiresTempSession
        ? Boolean(tempSessionId)
        : Boolean(targetId || tempSessionId);
    const canUploadDocuments =
        showActions &&
        !readOnly &&
        !busy &&
        canAddressTarget &&
        Boolean(onUploadDocument);
    const hasPendingUploads = useMemo(
        () => uploadItems.some((item) => item.state === "uploading"),
        [uploadItems],
    );
    const activeDocuments = documents.filter((documentItem) => documentItem.status === "ACTIVE");
    const allRowsCount = tempDocuments.length + activeDocuments.length;

    useEffect(() => {
        onPendingUploadsChange?.(hasPendingUploads);
    }, [hasPendingUploads, onPendingUploadsChange]);

    useEffect(() => () => {
        onPendingUploadsChange?.(false);
        onBeforeParentSubmitChange?.(null);
    }, [onBeforeParentSubmitChange, onPendingUploadsChange]);

    const updateUploadItem = useCallback((
        rowId: string,
        patch: Partial<DocumentUploadItem>,
    ) => {
        if (!mountedRef.current) {
            return;
        }

        setUploadItems((current) =>
            current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
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

    const startUploadProgressFallback = useCallback((rowId: string) => {
        clearUploadProgressFallback(rowId);

        const intervalId = setInterval(() => {
            if (!mountedRef.current) {
                clearUploadProgressFallback(rowId);
                return;
            }

            setUploadItems((current) =>
                current.map((row) => {
                    if (row.id !== rowId || row.state !== "uploading") {
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

                    return {
                        ...row,
                        progress: nextProgress,
                    };
                }),
            );
        }, FALLBACK_PROGRESS_INTERVAL_MS);

        progressFallbackTimersRef.current.set(rowId, intervalId);
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

    const clearDocumentTitleDraft = useCallback((documentId: string) => {
        setDocumentTitleDrafts((current) => {
            const nextDrafts = { ...current };
            delete nextDrafts[documentId];
            return nextDrafts;
        });
    }, []);

    const getDocumentTitleValue = useCallback(
        (documentItem: DocumentAttachment) =>
            documentTitleDrafts[documentItem.id] ?? resolveDocumentTitle(documentItem),
        [documentTitleDrafts],
    );

    const getNormalizedDraftTitle = useCallback(
        (documentItem: DocumentAttachment): string => normalizeDocumentTitleInput(
            documentTitleDrafts[documentItem.id] ?? resolveDocumentTitle(documentItem),
            documentItem.originalFileName,
        ),
        [documentTitleDrafts],
    );

    const hasTitleChange = useCallback(
        (documentItem: DocumentAttachment): boolean => {
            const draftTitle = documentTitleDrafts[documentItem.id];
            if (draftTitle === undefined) {
                return false;
            }
            if (!draftTitle.trim()) {
                return false;
            }

            const nextTitle = normalizeDocumentTitleInput(
                draftTitle,
                documentItem.originalFileName,
            );
            return !!nextTitle.trim() && nextTitle !== resolveDocumentTitle(documentItem);
        },
        [documentTitleDrafts],
    );

    const handleSaveDocumentTitle = useCallback(
        async (documentItem: DocumentAttachment) => {
            if (readOnly || !onUpdateDocumentTitle || !hasTitleChange(documentItem)) {
                return;
            }

            const nextTitle = getNormalizedDraftTitle(documentItem);
            setSavingTitleIds((current) => new Set(current).add(documentItem.id));
            setActionMessage(null);

            try {
                await onUpdateDocumentTitle(documentItem.id, nextTitle);
                clearDocumentTitleDraft(documentItem.id);
                setActionMessage({
                    design: "Positive",
                    text: t("document.titleSave.success", {
                        defaultValue: "عنوان مستند با موفقیت ذخیره شد.",
                    }),
                });
            } catch (titleError) {
                setActionMessage({
                    design: "Negative",
                    text:
                        titleError instanceof Error && titleError.message
                            ? titleError.message
                            : t("document.errors.updateTitle", {
                                  defaultValue: "خطا در ثبت عنوان مستند",
                              }),
                });
            } finally {
                setSavingTitleIds((current) => {
                    const next = new Set(current);
                    next.delete(documentItem.id);
                    return next;
                });
            }
        },
        [
            clearDocumentTitleDraft,
            getNormalizedDraftTitle,
            hasTitleChange,
            onUpdateDocumentTitle,
            readOnly,
            t,
        ],
    );

    useEffect(() => {
        if (!onBeforeParentSubmitChange) {
            return;
        }

        onBeforeParentSubmitChange(async () => {
            if (hasPendingUploads) {
                setActionMessage({
                    design: "Negative",
                    text: t("document.validation.waitForUpload", {
                        defaultValue: "تا پایان بارگذاری فایل‌ها صبر کنید.",
                    }),
                });
                return false;
            }

            return true;
        });

        return () => onBeforeParentSubmitChange(null);
    }, [
        hasPendingUploads,
        onBeforeParentSubmitChange,
        t,
    ]);

    const uploadDocumentFile = async (file: File) => {
        const maxFileSizeBytes = uploadPolicy?.maxFileSizeBytes;
        if (maxFileSizeBytes && file.size > maxFileSizeBytes) {
            setActionMessage({
                design: "Negative",
                text: t("document.validation.fileTooLarge", {
                    defaultValue: "اندازه فایل از سقف مجاز آپلود بیشتر است.",
                }),
            });
            return;
        }

        if (!onUploadDocument || !canAddressTarget) {
            setActionMessage({
                design: "Negative",
                text: targetUnavailableText,
            });
            return;
        }

        const rowId = createUploadRowId();
        setUploadItems((current) => [
            ...current,
            {
                id: rowId,
                fileName: file.name,
                contentType: file.type,
                sizeBytes: file.size,
                progress: 1,
                state: "uploading",
            },
        ]);
        startUploadProgressFallback(rowId);

        try {
            await onUploadDocument(file, (progress) => {
                if (!mountedRef.current) {
                    return;
                }

                const nextProgress = Math.min(99, normalizeVisibleProgress(progress));
                setUploadItems((current) =>
                    current.map((row) => {
                        if (row.id !== rowId || row.state !== "uploading") {
                            return row;
                        }

                        return {
                            ...row,
                            progress: Math.max(row.progress ?? 1, nextProgress),
                        };
                    }),
                );
            });
            clearUploadProgressFallback(rowId);
            updateUploadItem(rowId, {
                state: "success",
                progress: 100,
            });
            if (mountedRef.current) {
                setActionMessage({
                    design: "Positive",
                    text: t("document.upload.success", {
                        defaultValue: "فایل «{{fileName}}» با موفقیت بارگذاری شد.",
                        fileName: file.name,
                    }),
                });
                scheduleSuccessfulUploadRemoval(rowId);
            }
        } catch (uploadError) {
            clearUploadProgressFallback(rowId);
            const message =
                uploadError instanceof HttpError &&
                uploadError.code === "DOCUMENT_STORAGE_DISABLED"
                    ? t("document.errors.storageDisabled", {
                          defaultValue:
                              "زیرساخت نگهداری مستندات پیکربندی نشده است. MinIO را فعال کنید.",
                      })
                    : uploadError instanceof Error && uploadError.message
                      ? uploadError.message
                      : t("document.errors.upload", {
                            defaultValue: "آپلود فایل انجام نشد",
                        });

            if (mountedRef.current) {
                setActionMessage({
                    design: "Negative",
                    text: message,
                });
            }
            updateUploadItem(rowId, {
                state: "error",
                progress: 100,
                error: message,
            });
        }
    };

    const handleDocumentFilesChange = (event: unknown) => {
        const changeEvent = event as {
            detail?: { files?: FileList | null };
            target?: { value?: string };
        };
        const files = Array.from(changeEvent.detail?.files ?? []);
        if (changeEvent.target) {
            changeEvent.target.value = "";
        }

        files.forEach((file) => {
            void uploadDocumentFile(file);
        });
    };

    const confirmDocumentDelete = async () => {
        if (!documentDeleteCandidate || !onDeleteDocument) {
            return;
        }

        try {
            await onDeleteDocument(documentDeleteCandidate.id);
            clearDocumentTitleDraft(documentDeleteCandidate.id);
            setDocumentDeleteCandidate(null);
        } catch (deleteError) {
            setActionMessage({
                design: "Negative",
                text:
                    deleteError instanceof Error && deleteError.message
                        ? deleteError.message
                        : t("document.errors.delete", {
                              defaultValue: "خطا در حذف مستند",
                          }),
            });
        }
    };

    const renderDocumentTitleControl = (documentItem: DocumentAttachment) => {
        const titleValue = getDocumentTitleValue(documentItem);

        if (readOnly || !onUpdateDocumentTitle) {
            return titleValue;
        }

        return (
            <Input
                accessibleName={t("document.fields.title", { defaultValue: "عنوان" })}
                value={titleValue}
                maxlength={500}
                disabled={busy}
                style={TITLE_INPUT_STYLE}
                onInput={(event) => {
                    const nextTitle = readInputValue(event);
                    setDocumentTitleDrafts((current) => ({
                        ...current,
                        [documentItem.id]: nextTitle,
                    }));
                }}
            />
        );
    };

    const renderDocumentActions = (documentItem: DocumentAttachment) => {
        if (!showActions) {
            return null;
        }

        const canDownload = documentItem.status === "ACTIVE" && Boolean(onDownloadDocument);
        const canDelete = !readOnly && Boolean(onDeleteDocument);
        const canSaveTitle = !readOnly && Boolean(onUpdateDocumentTitle);
        const savingTitle = savingTitleIds.has(documentItem.id);
        const saveTitleDisabled =
            busy ||
            savingTitle ||
            !hasTitleChange(documentItem) ||
            !getNormalizedDraftTitle(documentItem).trim();

        if (!canDownload && !canDelete && !canSaveTitle) {
            return NONE_TEXT;
        }

        return (
            <div style={ACTIONS_STYLE}>
                {canSaveTitle ? (
                    <Button
                        design="Transparent"
                        disabled={saveTitleDisabled}
                        onClick={() => {
                            void handleSaveDocumentTitle(documentItem);
                        }}
                    >
                        {t("document.actions.saveTitle", { defaultValue: "ذخیره" })}
                    </Button>
                ) : null}
                {canDownload ? (
                    <Button
                        design="Transparent"
                        disabled={busy}
                        onClick={() => {
                            void onDownloadDocument?.(documentItem.id);
                        }}
                    >
                        {t("document.actions.download", { defaultValue: "دانلود" })}
                    </Button>
                ) : null}
                {canDelete ? (
                    <Button
                        design="Transparent"
                        disabled={busy}
                        onClick={() => setDocumentDeleteCandidate(documentItem)}
                    >
                        {t("document.actions.delete", { defaultValue: "حذف" })}
                    </Button>
                ) : null}
            </div>
        );
    };

    const renderUploadStatusText = (item: DocumentUploadItem): string => {
        if (item.state === "success") {
            return t("document.upload.successState", { defaultValue: "بارگذاری کامل شد" });
        }

        if (item.state === "error") {
            return t("document.upload.failed", { defaultValue: "خطا در بارگذاری" });
        }

        const progress = normalizeProgress(item.progress);
        if (progress > 0) {
            return t("document.upload.fileProgress", {
                defaultValue: "در حال بارگذاری {{progress}}٪",
                progress,
            });
        }

        return t("document.upload.fileInProgress", {
            defaultValue: "در حال بارگذاری",
        });
    };

    const renderUploadProgressArea = () => {
        if (!showActions || uploadItems.length === 0) {
            return null;
        }

        return (
            <>
                <div style={TABLE_SPACER_STYLE} />
                <div style={UPLOAD_PROGRESS_AREA_STYLE}>
                    {uploadItems.some((item) => item.state === "uploading") ? (
                        <Text>
                            {t("document.upload.inProgress", {
                                defaultValue: "در حال بارگذاری فایل‌ها...",
                            })}
                        </Text>
                    ) : null}
                    {uploadItems.map((item) => {
                        const progress = typeof item.progress === "number"
                            ? normalizeVisibleProgress(item.progress)
                            : undefined;
                        const isComplete = item.state === "success" || item.state === "error";
                        const progressValue = isComplete ? 100 : progress ?? 1;
                        const hideProgressValue =
                            item.state === "error" ||
                            (item.state === "uploading" && progress === undefined);
                        const displayValue = item.state === "success"
                            ? "100٪"
                            : item.state === "uploading" && progress !== undefined
                              ? `${progress}٪`
                              : "";
                        const statusText = renderUploadStatusText(item);

                        return (
                            <div key={item.id} style={UPLOAD_ITEM_STYLE}>
                                <div style={UPLOAD_ITEM_HEADER_STYLE}>
                                    <div style={UPLOAD_ITEM_TITLE_STYLE}>
                                        <span style={UPLOAD_ITEM_NAME_STYLE}>
                                            {item.fileName}
                                        </span>
                                        <span style={UPLOAD_ITEM_META_STYLE}>
                                            {formatFileSize(item.sizeBytes)}
                                        </span>
                                    </div>
                                    {item.state === "error" ? (
                                        <Button
                                            design="Transparent"
                                            onClick={() => removeUploadItem(item.id)}
                                        >
                                            {t("document.upload.removeFailed", {
                                                defaultValue: "حذف",
                                            })}
                                        </Button>
                                    ) : null}
                                </div>

                                <ProgressIndicator
                                    accessibleName={statusText}
                                    displayValue={displayValue}
                                    hideValue={hideProgressValue}
                                    value={progressValue}
                                    valueState={item.state === "error"
                                        ? "Negative"
                                        : item.state === "success"
                                          ? "Positive"
                                          : "Information"}
                                />

                                <span
                                    style={
                                        item.state === "error"
                                            ? UPLOAD_ITEM_ERROR_STYLE
                                            : UPLOAD_ITEM_META_STYLE
                                    }
                                >
                                    {statusText}
                                    {item.error ? ` - ${item.error}` : ""}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    return (
        <div style={PANEL_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TEXT_STYLE}>
                    <Title level="H5">{documentTitle}</Title>
                    {documentHint ? <Text>{documentHint}</Text> : null}
                    {!readOnly && showActions ? <Text>{maxFileSizeText}</Text> : null}
                </div>

                {!readOnly && showActions ? (
                    <FileUploader
                        hideInput
                        multiple
                        disabled={!canUploadDocuments}
                        maxFileSize={uploadPolicy?.maxFileSizeMb}
                        onChange={handleDocumentFilesChange}
                        onFileSizeExceed={() => {
                            setActionMessage({
                                design: "Negative",
                                text: t("document.validation.fileTooLarge", {
                                    defaultValue:
                                        "اندازه فایل از سقف مجاز آپلود بیشتر است.",
                                }),
                            });
                        }}
                    >
                        <Button design="Emphasized" disabled={!canUploadDocuments}>
                            {t("document.actions.upload", { defaultValue: "انتخاب فایل" })}
                        </Button>
                    </FileUploader>
                ) : null}
            </div>

            {!readOnly && showActions && !canAddressTarget ? (
                <>
                    <div style={TABLE_SPACER_STYLE} />
                    <MessageStrip design="Information" hideCloseButton>
                        {targetUnavailableText}
                    </MessageStrip>
                </>
            ) : null}

            {error ? (
                <>
                    <div style={TABLE_SPACER_STYLE} />
                    <MessageStrip
                        design="Negative"
                        hideCloseButton={!showActions}
                        onClose={showActions ? onErrorClose : undefined}
                    >
                        {error}
                    </MessageStrip>
                </>
            ) : null}

            {actionMessage ? (
                <>
                    <div style={TABLE_SPACER_STYLE} />
                    <MessageStrip
                        design={actionMessage.design}
                        hideCloseButton={!showActions}
                        onClose={showActions ? () => setActionMessage(null) : undefined}
                    >
                        {actionMessage.text}
                    </MessageStrip>
                </>
            ) : null}

            {renderUploadProgressArea()}

            <div style={TABLE_SPACER_STYLE} />

            <Table
                accessibleName={documentTitle}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell minWidth="12rem">
                            {t("document.fields.title", { defaultValue: "عنوان" })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("document.fields.originalFileName", {
                                defaultValue: "نام فایل",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="10rem">
                            {t("document.fields.contentType", {
                                defaultValue: "نوع فایل",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("document.fields.size", { defaultValue: "حجم" })}
                        </TableHeaderCell>
                        <TableHeaderCell width="10rem">
                            {t("document.fields.status", { defaultValue: "وضعیت" })}
                        </TableHeaderCell>
                        <TableHeaderCell width="10rem">
                            {t("document.fields.uploadedAt", {
                                defaultValue: "تاریخ بارگذاری",
                            })}
                        </TableHeaderCell>
                        {showActions ? (
                            <TableHeaderCell width="10rem">
                                {t("document.fields.actions", { defaultValue: "عملیات" })}
                            </TableHeaderCell>
                        ) : null}
                    </TableHeaderRow>
                }
                loading={busy}
                loadingDelay={0}
                noDataText={noDataText}
                overflowMode="Popin"
            >
                {allRowsCount === 0 ? null : (
                    <>
                        {tempDocuments.map((documentItem) => (
                            <TableRow key={documentItem.id} rowKey={documentItem.id}>
                                <TableCell>{renderDocumentTitleControl(documentItem)}</TableCell>
                                <TableCell>{documentItem.originalFileName}</TableCell>
                                <TableCell>{displayText(documentItem.contentType)}</TableCell>
                                <TableCell>{formatFileSize(documentItem.sizeBytes)}</TableCell>
                                <TableCell>
                                    {t("document.status.temp", { defaultValue: "موقت" })}
                                </TableCell>
                                <TableCell>
                                    {formatDocumentUploadedAt(documentItem.uploadedAt)}
                                </TableCell>
                                {showActions ? (
                                    <TableCell>{renderDocumentActions(documentItem)}</TableCell>
                                ) : null}
                            </TableRow>
                        ))}

                        {activeDocuments.map((documentItem) => (
                            <TableRow key={documentItem.id} rowKey={documentItem.id}>
                                <TableCell>{renderDocumentTitleControl(documentItem)}</TableCell>
                                <TableCell>{documentItem.originalFileName}</TableCell>
                                <TableCell>{displayText(documentItem.contentType)}</TableCell>
                                <TableCell>{formatFileSize(documentItem.sizeBytes)}</TableCell>
                                <TableCell>
                                    {t("document.status.active", {
                                        defaultValue: "ثبت‌شده",
                                    })}
                                </TableCell>
                                <TableCell>
                                    {formatDocumentUploadedAt(documentItem.uploadedAt)}
                                </TableCell>
                                {showActions ? (
                                    <TableCell>{renderDocumentActions(documentItem)}</TableCell>
                                ) : null}
                            </TableRow>
                        ))}
                    </>
                )}
            </Table>

            {showActions ? (
                <DeleteConfirmDialog
                    open={Boolean(documentDeleteCandidate)}
                    title={t("document.delete.title", { defaultValue: "حذف مستند" })}
                    message={t("document.delete.confirm", {
                        defaultValue: "آیا از حذف مستند «{{title}}» مطمئن هستید؟",
                        title: documentDeleteCandidate
                            ? getDocumentTitleValue(documentDeleteCandidate)
                            : "",
                    })}
                    confirmText={t("document.actions.delete", { defaultValue: "حذف" })}
                    cancelText={t("common.cancel", { defaultValue: "انصراف" })}
                    loading={busy}
                    onClose={() => setDocumentDeleteCandidate(null)}
                    onConfirm={() => {
                        void confirmDocumentDelete();
                    }}
                />
            ) : null}
        </div>
    );
}
