export const DOCUMENT_LINK_TARGET_TYPES = [
    "ORG",
    "CENTRAL_PROCESS",
    "CENTRAL_SUBPROCESS",
    "CENTRAL_CONTROL",
    "CENTRAL_CONTROL_OBJECTIVE_DEF",
    "CENTRAL_RISK_CATEGORY",
    "CENTRAL_RISK_TEMPLATE",
    "CENTRAL_ACCOUNT_GROUP",
    "CENTRAL_REGULATION_GROUP",
    "CENTRAL_REGULATION",
    "CENTRAL_REQUIREMENT",
    "CENTRAL_POLICY_GROUP",
    "CENTRAL_POLICY",
    "CENTRAL_POLICY_VERSION",
    "CENTRAL_CONTROL_SCOPE",
    "CENTRAL_RISK_SCOPE",
    "CENTRAL_OBJECTIVE_SCOPE",
    "CENTRAL_REQUIREMENT_SCOPE",
    "CENTRAL_POLICY_SUBPROCESS",
    "CENTRAL_POLICY_CONTROL",
    "CENTRAL_POLICY_REQUIREMENT",
    "CENTRAL_CONTROL_ACCOUNT_GROUP",
    "CENTRAL_OBJECTIVE_ACCOUNT_GROUP",
    "CENTRAL_RISK_CONTROL_COV",
    "CENTRAL_RISK_OBJECTIVE_COV",
    "CENTRAL_CONTROL_OBJECTIVE_COV",
    "CENTRAL_REQUIREMENT_CONTROL_COV",
    "LOCAL_CONTEXT",
    "LOCAL_CONTROL_SCOPE",
    "LOCAL_RISK_SCOPE",
    "LOCAL_OBJECTIVE_SCOPE",
    "LOCAL_REQUIREMENT_SCOPE",
    "LOCAL_RISK_CONTROL_COV",
    "LOCAL_RISK_OBJECTIVE_COV",
    "LOCAL_CONTROL_OBJECTIVE_COV",
    "LOCAL_REQUIREMENT_CONTROL_COV",
    "LOCAL_POLICY_ORG",
    "LOCAL_POLICY_SUBPROCESS",
    "LOCAL_POLICY_CONTROL",
    "LOCAL_POLICY_REQUIREMENT",
] as const;

export type DocumentLinkTargetType = typeof DOCUMENT_LINK_TARGET_TYPES[number];

export type DocumentLifecycleStatus = "ACTIVE" | "INACTIVE" | "DELETED";

export type DocumentTempUploadStatus =
    | "UPLOADING"
    | "AVAILABLE"
    | "CONSUMED"
    | "EXPIRED"
    | "FAILED";

export interface DocumentTemporaryUpload {
    tempUploadId: string;
    originalFileName: string;
    mimeType?: string | null;
    fileSize: number;
    uploadStatus: DocumentTempUploadStatus;
    uploadedAt: string;
    expiresAt: string;
    version: number;
}

export interface DocumentDetail {
    documentId: string;
    code?: string | null;
    title: string;
    description?: string | null;
    documentCategoryCode?: string | null;
    status: DocumentLifecycleStatus;
    validFrom?: string | null;
    validTo?: string | null;
    version: number;
    createdAt: string;
    createdBy?: string | null;
    updatedAt: string;
    updatedBy?: string | null;
}

export interface DocumentVersion {
    documentVersionId: string;
    documentId: string;
    documentVersionNumber: number;
    fileName: string;
    mimeType?: string | null;
    fileSize: number;
    checksumAlgorithm?: string | null;
    status: DocumentLifecycleStatus;
    validFrom?: string | null;
    validTo?: string | null;
    version: number;
    createdAt: string;
    createdBy?: string | null;
    updatedAt: string;
    updatedBy?: string | null;
}

export interface DocumentLinkSummary {
    documentId: string;
    documentVersion: number;
    code?: string | null;
    title: string;
    description?: string | null;
    documentCategoryCode?: string | null;
    documentStatus: DocumentLifecycleStatus;
    documentVersionId: string;
    documentVersionNumber: number;
    fileName: string;
    mimeType?: string | null;
    fileSize: number;
    checksumAlgorithm?: string | null;
    versionStatus: DocumentLifecycleStatus;
    documentLinkId: string;
    linkVersion: number;
    targetType: DocumentLinkTargetType;
    targetId: string;
    linkStatus: DocumentLifecycleStatus;
    uploadedAt: string;
    uploadedBy?: string | null;
}

export interface DocumentCommandResponse {
    entityId: string;
    revisionId: string;
    documentVersion: number;
    documentVersionId?: string | null;
    documentVersionNumber?: number | null;
    documentLinkId?: string | null;
    summary?: DocumentLinkSummary | null;
}

export interface DocumentCreatePayload {
    tempUploadId: string;
    code?: string | null;
    title: string;
    description?: string | null;
    documentCategoryCode?: string | null;
    targetType: DocumentLinkTargetType;
    targetId: string;
    validFrom?: string | null;
    validTo?: string | null;
}

export interface DocumentAddVersionPayload {
    tempUploadId: string;
    expectedDocumentVersion: number;
    targetType: DocumentLinkTargetType;
    targetId: string;
    validFrom?: string | null;
    validTo?: string | null;
}

export interface DocumentMetadataUpdatePayload {
    expectedVersion: number;
    targetType: DocumentLinkTargetType;
    targetId: string;
    code?: string | null;
    title?: string | null;
    description?: string | null;
    documentCategoryCode?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
}

export interface DocumentLifecyclePayload {
    expectedVersion: number;
    targetType: DocumentLinkTargetType;
    targetId: string;
}

export interface DocumentLinkLifecyclePayload {
    expectedVersion: number;
}

export interface DocumentDownloadAccess {
    downloadUrl: string;
    expiresAt: string;
    fileName: string;
    mimeType?: string | null;
}
