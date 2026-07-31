import { httpClient, HttpError } from "@/shared/infra/http.client";
import i18n from "@/i18n/i18n";
import type {
    DocumentAddVersionPayload,
    DocumentCommandResponse,
    DocumentCreatePayload,
    DocumentDownloadAccess,
    DocumentLifecyclePayload,
    DocumentLinkLifecyclePayload,
    DocumentLinkSummary,
    DocumentLinkTargetType,
    DocumentMetadataUpdatePayload,
    DocumentTemporaryUpload,
} from "../domain/document.model";

const API_BASE = "/api/master-data";
const BROWSER_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim();

interface ApiErrorPayload {
    message?: unknown;
    code?: unknown;
}

function isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

function buildUrl(path: string): string {
    if (isAbsoluteUrl(path)) {
        return path;
    }

    const normalizedBase = BROWSER_API_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}

function appendQuery(
    path: string,
    params: Record<string, string | number | undefined | null>,
): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && `${value}`.trim()) {
            query.set(key, `${value}`);
        }
    });

    const queryText = query.toString();
    return queryText ? `${path}?${queryText}` : path;
}

function getCurrentLanguage(): string {
    return i18n.resolvedLanguage || i18n.language || "fa";
}

function parseErrorPayload(status: number, raw: string): {
    message: string;
    code?: string;
    data?: unknown;
} {
    if (!raw.trim()) {
        return { message: `HTTP ${status}` };
    }

    try {
        const parsed = JSON.parse(raw) as ApiErrorPayload;
        if (typeof parsed.message === "string" && parsed.message.trim()) {
            return {
                message: parsed.message,
                code: typeof parsed.code === "string" ? parsed.code : undefined,
                data: parsed,
            };
        }
        if (typeof parsed.code === "string" && parsed.code.trim()) {
            return {
                message: parsed.code,
                code: parsed.code,
                data: parsed,
            };
        }
    } catch {
        return { message: raw };
    }

    return { message: raw };
}

function uploadWithProgress<T>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", buildUrl(url));
        xhr.withCredentials = true;
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Accept-Language", getCurrentLanguage());

        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable || !onProgress || event.total <= 0) {
                return;
            }

            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(Math.min(99, Math.max(1, progress)));
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress?.(100);
                const payload = xhr.responseText ? (JSON.parse(xhr.responseText) as T) : undefined;
                resolve(payload as T);
                return;
            }

            const errorPayload = parseErrorPayload(xhr.status, xhr.responseText);
            reject(new HttpError(
                errorPayload.message,
                xhr.status,
                errorPayload.code,
                errorPayload.data ?? xhr.responseText,
            ));
        };

        xhr.onerror = () => {
            reject(new Error(i18n.t("document.errors.upload", {
                defaultValue: "File upload failed",
            })));
        };

        xhr.send(formData);
    });
}

export class DocumentApiRepo {
    uploadTemporary(
        file: File,
        onProgress?: (progress: number) => void,
    ): Promise<DocumentTemporaryUpload> {
        const formData = new FormData();
        formData.append("file", file);

        return uploadWithProgress<DocumentTemporaryUpload>(
            `${API_BASE}/document-temporary-uploads`,
            formData,
            onProgress,
        );
    }

    getTemporaryUpload(tempUploadId: string): Promise<DocumentTemporaryUpload> {
        return httpClient.get<DocumentTemporaryUpload>(
            `${API_BASE}/document-temporary-uploads/${tempUploadId}`,
        );
    }

    listByTarget(
        targetType: DocumentLinkTargetType,
        targetId: string,
    ): Promise<DocumentLinkSummary[]> {
        return httpClient.get<DocumentLinkSummary[]>(
            appendQuery(`${API_BASE}/document-links`, { targetType, targetId }),
        );
    }

    getDocument(documentId: string): Promise<DocumentLinkSummary> {
        return httpClient.get<DocumentLinkSummary>(`${API_BASE}/documents/${documentId}`);
    }

    listVersions(documentId: string): Promise<DocumentLinkSummary[]> {
        return httpClient.get<DocumentLinkSummary[]>(
            `${API_BASE}/documents/${documentId}/versions`,
        );
    }

    getVersion(documentVersionId: string): Promise<DocumentLinkSummary> {
        return httpClient.get<DocumentLinkSummary>(
            `${API_BASE}/document-versions/${documentVersionId}`,
        );
    }

    createDocument(payload: DocumentCreatePayload): Promise<DocumentCommandResponse> {
        return httpClient.post<DocumentCommandResponse>(
            `${API_BASE}/documents`,
            payload,
        );
    }

    addVersion(
        documentId: string,
        payload: DocumentAddVersionPayload,
    ): Promise<DocumentCommandResponse> {
        return httpClient.post<DocumentCommandResponse>(
            `${API_BASE}/documents/${documentId}/versions`,
            payload,
        );
    }

    updateMetadata(
        documentId: string,
        payload: DocumentMetadataUpdatePayload,
    ): Promise<DocumentCommandResponse> {
        return httpClient.patch<DocumentCommandResponse>(
            `${API_BASE}/documents/${documentId}`,
            payload,
        );
    }

    documentLifecycle(
        documentId: string,
        action: "activate" | "inactivate" | "delete" | "restore",
        payload: DocumentLifecyclePayload,
    ): Promise<DocumentCommandResponse> {
        return httpClient.post<DocumentCommandResponse>(
            `${API_BASE}/documents/${documentId}/${action}`,
            payload,
        );
    }

    createLink(
        documentVersionId: string,
        targetType: DocumentLinkTargetType,
        targetId: string,
    ): Promise<DocumentCommandResponse> {
        return httpClient.post<DocumentCommandResponse>(
            `${API_BASE}/document-versions/${documentVersionId}/links`,
            { targetType, targetId },
        );
    }

    linkLifecycle(
        documentLinkId: string,
        action: "activate" | "inactivate" | "delete" | "restore",
        payload: DocumentLinkLifecyclePayload,
    ): Promise<DocumentCommandResponse> {
        return httpClient.post<DocumentCommandResponse>(
            `${API_BASE}/document-links/${documentLinkId}/${action}`,
            payload,
        );
    }

    createDownloadAccess(documentVersionId: string): Promise<DocumentDownloadAccess> {
        return httpClient.post<DocumentDownloadAccess>(
            `${API_BASE}/document-versions/${documentVersionId}/download`,
            undefined,
            { successMessage: false },
        );
    }
}
