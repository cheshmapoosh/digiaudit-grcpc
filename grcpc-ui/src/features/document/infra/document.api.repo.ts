import { httpClient, HttpError } from "@/shared/infra/http.client";
import i18n from "@/i18n/i18n";
import type {
    DocumentAttachment,
    DocumentCommitPayload,
    DocumentDownloadUrl,
    DocumentTempUploadPayload,
    DocumentUploadPolicy,
} from "../domain/document.model";

const BASE_URL = "/api/documents";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim();

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

    const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}

function appendQuery(path: string, params: Record<string, string | undefined>): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            query.set(key, value);
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
            if (!event.lengthComputable || !onProgress) {
                return;
            }

            onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress?.(100);
                const payload = xhr.responseText
                    ? JSON.parse(xhr.responseText) as T
                    : undefined as T;
                resolve(payload);
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
            reject(new Error("Upload failed"));
        };

        xhr.send(formData);
    });
}

export class DocumentApiRepo {
    list(targetType: string, targetId: string): Promise<DocumentAttachment[]> {
        return httpClient.get<DocumentAttachment[]>(
            appendQuery(BASE_URL, { targetType, targetId }),
        );
    }

    listTemp(targetType: string, tempSessionId: string): Promise<DocumentAttachment[]> {
        return httpClient.get<DocumentAttachment[]>(
            appendQuery(`${BASE_URL}/temp`, { targetType, tempSessionId }),
        );
    }

    uploadPolicy(targetType: string): Promise<DocumentUploadPolicy> {
        return httpClient.get<DocumentUploadPolicy>(
            appendQuery(`${BASE_URL}/upload-policy`, { targetType }),
        );
    }

    uploadTemp(
        payload: DocumentTempUploadPayload,
        onProgress?: (progress: number) => void,
    ): Promise<DocumentAttachment> {
        const formData = new FormData();
        formData.append("targetType", payload.targetType);
        formData.append("tempSessionId", payload.tempSessionId);
        if (payload.targetId) {
            formData.append("targetId", payload.targetId);
        }
        if (payload.title) {
            formData.append("title", payload.title);
        }
        formData.append("file", payload.file);

        return uploadWithProgress<DocumentAttachment>(
            `${BASE_URL}/temp`,
            formData,
            onProgress,
        );
    }

    commitTemp(payload: DocumentCommitPayload): Promise<DocumentAttachment[]> {
        return httpClient.post<DocumentAttachment[]>(`${BASE_URL}/commit`, payload);
    }

    updateTitle(id: string, title: string): Promise<DocumentAttachment> {
        return httpClient.patch<DocumentAttachment>(`${BASE_URL}/${id}/title`, { title });
    }

    delete(id: string): Promise<void> {
        return httpClient.delete<void>(`${BASE_URL}/${id}`);
    }

    createDownloadUrl(id: string): Promise<DocumentDownloadUrl> {
        return httpClient.get<DocumentDownloadUrl>(`${BASE_URL}/${id}/download-url`);
    }
}
