import type { AuditFields } from "@/shared/domain/audit.model";

export type DocumentStatus = "ACTIVE" | "TEMP" | "DELETED" | "QUARANTINED";

export interface DocumentAttachment extends AuditFields {
    id: string;
    targetType: string;
    targetId: string | null;
    bucketName: string;
    objectKey: string;
    originalFileName: string;
    title: string;
    contentType?: string;
    sizeBytes?: number;
    checksumSha256?: string;
    versionId?: string;
    status: DocumentStatus;
    uploadedBy?: string;
    uploadedAt: string;
    tempSessionId?: string;
    expiresAt?: string;
    committedAt?: string;
}

export interface DocumentDownloadUrl {
    url: string;
    expiresAt: string;
}

export interface DocumentUploadPolicy {
    targetType: string;
    maxFileSizeBytes: number;
    maxFileSizeMb: number;
    tempTtlMinutes: number;
}

export interface DocumentCommitPayload {
    tempSessionId: string;
    targetType: string;
    targetId: string;
    documentIds?: string[];
    documentTitles?: Record<string, string>;
}

export interface DocumentUploadPayload {
    targetType: string;
    targetId: string;
    title?: string;
    file: File;
}

export interface DocumentTempUploadPayload {
    targetType: string;
    tempSessionId: string;
    targetId?: string | null;
    title?: string;
    file: File;
}
