import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import "@ui5/webcomponents-fiori/dist/UploadCollection.js";
import "@ui5/webcomponents-fiori/dist/UploadCollectionItem.js";
import {
    Button,
    FileUploader,
    Input,
    Label,
    MessageStrip,
    Text,
    Title,
    UploadCollection,
    UploadCollectionItem,
} from "@ui5/webcomponents-react";

import type { DocumentAttachment, DocumentUploadPolicy } from "../domain/document.model";

export interface DocumentAttachmentsPanelProps {
    title: string;
    readOnly?: boolean;
    documents?: DocumentAttachment[];
    tempDocuments?: DocumentAttachment[];
    uploadPolicy?: DocumentUploadPolicy;
    tempSessionId?: string;
    busy?: boolean;
    documentsBusy?: boolean;
    onUploadDocument?: (file: File, onProgress?: (p: number) => void) => Promise<void> | void;
    onUpdateDocumentTitle?: (id: string, title: string) => Promise<void> | void;
    onDeleteDocument?: (id: string) => Promise<void> | void;
    onDownloadDocument?: (id: string) => Promise<void> | void;
    onError?: (msg: string) => void;
    onUploadingChange?: (uploading: boolean) => void;
}

type UploadRow = {
    id: string;
    fileName: string;
    sizeBytes: number;
    progress: number;
    error?: string;
    uploading: boolean;
};

function createId() {
    return typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random()}`;
}

function formatSize(size?: number) {
    if (!size) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let s = size;
    let i = 0;
    while (s >= 1024 && i < units.length - 1) {
        s /= 1024;
        i++;
    }
    return `${s.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function DocumentAttachmentsPanel({
    title,
    readOnly,
    documents = [],
    tempDocuments = [],
    uploadPolicy,
    tempSessionId,
    busy,
    documentsBusy,
    onUploadDocument,
    onUpdateDocumentTitle,
    onDeleteDocument,
    onDownloadDocument,
    onError,
    onUploadingChange,
}: DocumentAttachmentsPanelProps) {
    const { t } = useTranslation();

    const [rows, setRows] = useState<UploadRow[]>([]);
    const [draftTitles, setDraftTitles] = useState<Record<string, string>>({});

    const uploading = rows.some(r => r.uploading);

    useEffect(() => {
        onUploadingChange?.(uploading);
    }, [uploading, onUploadingChange]);

    const handleUpload = async (file: File) => {
        if (!onUploadDocument || !tempSessionId) return;

        const max = uploadPolicy?.maxFileSizeBytes;
        if (max && file.size > max) {
            onError?.(t("document.error.size", { defaultValue: "حجم فایل بیش از حد مجاز است" }));
            return;
        }

        const id = createId();
        setRows(prev => [...prev, {
            id,
            fileName: file.name,
            sizeBytes: file.size,
            progress: 0,
            uploading: true,
        }]);

        try {
            await onUploadDocument(file, (p) => {
                setRows(prev => prev.map(r => r.id === id ? { ...r, progress: p } : r));
            });

            setRows(prev => prev.filter(r => r.id !== id));
        } catch (e: any) {
            setRows(prev => prev.map(r => r.id === id ? { ...r, uploading: false, error: e?.message } : r));
            onError?.(e?.message || "upload error");
        }
    };

    const renderTitle = (doc: DocumentAttachment) => {
        if (readOnly || !onUpdateDocumentTitle) {
            return <strong>{doc.title || doc.originalFileName}</strong>;
        }

        return (
            <Input
                value={draftTitles[doc.id] ?? doc.title ?? doc.originalFileName}
                onInput={(e: any) => {
                    const v = e.target.value;
                    setDraftTitles(prev => ({ ...prev, [doc.id]: v }));
                }}
                onChange={async () => {
                    const title = draftTitles[doc.id];
                    if (!title) return;
                    await onUpdateDocumentTitle?.(doc.id, title);
                }}
            />
        );
    };

    return (
        <div style={{ display: "grid", gap: "0.75rem" } as CSSProperties}>
            <Title level="H5">{title}</Title>

            {!readOnly && (
                <FileUploader
                    hideInput
                    multiple
                    onChange={(e: any) => {
                        const files = Array.from(e.detail?.files ?? []);
                        files.forEach(f => void handleUpload(f));
                    }}
                >
                    <Button disabled={busy || documentsBusy} design="Emphasized">
                        {t("document.upload", { defaultValue: "آپلود فایل" })}
                    </Button>
                </FileUploader>
            )}

            <UploadCollection>
                {rows.map(r => (
                    <UploadCollectionItem
                        key={r.id}
                        fileName={r.fileName}
                        progress={r.progress}
                        uploadState={r.uploading ? "Uploading" : "Error"}
                    >
                        <Text>{formatSize(r.sizeBytes)}</Text>
                        {r.error && <MessageStrip design="Negative">{r.error}</MessageStrip>}
                    </UploadCollectionItem>
                ))}

                {documents.map(doc => (
                    <UploadCollectionItem
                        key={doc.id}
                        fileName={doc.originalFileName}
                        fileNameClickable={!!onDownloadDocument}
                        onFileNameClick={() => onDownloadDocument?.(doc.id)}
                        uploadState="Complete"
                    >
                        {renderTitle(doc)}
                        <Text>{formatSize(doc.sizeBytes)}</Text>
                    </UploadCollectionItem>
                ))}

                {tempDocuments.map(doc => (
                    <UploadCollectionItem
                        key={doc.id}
                        fileName={doc.originalFileName}
                        uploadState="Complete"
                    >
                        {renderTitle(doc)}
                        <Text>{t("document.temp", { defaultValue: "موقت" })}</Text>
                    </UploadCollectionItem>
                ))}
            </UploadCollection>
        </div>
    );
}
