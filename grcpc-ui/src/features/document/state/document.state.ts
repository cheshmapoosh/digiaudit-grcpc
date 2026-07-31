import { create } from "zustand";

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
import { DocumentApiRepo } from "../infra/document.api.repo";

const documentRepo = new DocumentApiRepo();

interface DocumentState {
    linkedDocumentsByTarget: Record<string, DocumentLinkSummary[]>;
    temporaryUploadsById: Record<string, DocumentTemporaryUpload>;
    loading: boolean;

    loadForTarget(targetType: DocumentLinkTargetType, targetId: string): Promise<void>;
    uploadTemporary(
        file: File,
        onProgress?: (progress: number) => void,
    ): Promise<DocumentTemporaryUpload>;
    getTemporaryUpload(tempUploadId: string): Promise<DocumentTemporaryUpload>;
    createDocument(payload: DocumentCreatePayload): Promise<DocumentCommandResponse>;
    addVersion(
        documentId: string,
        payload: DocumentAddVersionPayload,
    ): Promise<DocumentCommandResponse>;
    updateMetadata(
        documentId: string,
        payload: DocumentMetadataUpdatePayload,
    ): Promise<DocumentCommandResponse>;
    documentLifecycle(
        documentId: string,
        action: "activate" | "inactivate" | "delete" | "restore",
        payload: DocumentLifecyclePayload,
    ): Promise<DocumentCommandResponse>;
    linkLifecycle(
        documentLinkId: string,
        action: "activate" | "inactivate" | "delete" | "restore",
        payload: DocumentLinkLifecyclePayload,
    ): Promise<DocumentCommandResponse>;
    createDownloadAccess(documentVersionId: string): Promise<DocumentDownloadAccess>;
    reset(): void;
}

function targetKey(targetType: DocumentLinkTargetType, targetId: string): string {
    return `${targetType}:${targetId}`;
}

function updateTargetRows(
    rows: DocumentLinkSummary[],
    response: DocumentCommandResponse,
): DocumentLinkSummary[] {
    const summary = response.summary;
    if (!summary) {
        return rows;
    }

    const nextRows = rows.filter((row) => row.documentLinkId !== summary.documentLinkId);
    return [summary, ...nextRows];
}

export const useDocumentState = create<DocumentState>((set) => ({
    linkedDocumentsByTarget: {},
    temporaryUploadsById: {},
    loading: false,

    async loadForTarget(targetType, targetId) {
        set({ loading: true });

        try {
            const rows = await documentRepo.listByTarget(targetType, targetId);
            set((state) => ({
                linkedDocumentsByTarget: {
                    ...state.linkedDocumentsByTarget,
                    [targetKey(targetType, targetId)]: rows,
                },
            }));
        } finally {
            set({ loading: false });
        }
    },

    async uploadTemporary(file, onProgress) {
        const uploaded = await documentRepo.uploadTemporary(file, onProgress);
        set((state) => ({
            temporaryUploadsById: {
                ...state.temporaryUploadsById,
                [uploaded.tempUploadId]: uploaded,
            },
        }));
        return uploaded;
    },

    async getTemporaryUpload(tempUploadId) {
        const upload = await documentRepo.getTemporaryUpload(tempUploadId);
        set((state) => ({
            temporaryUploadsById: {
                ...state.temporaryUploadsById,
                [upload.tempUploadId]: upload,
            },
        }));
        return upload;
    },

    async createDocument(payload) {
        const response = await documentRepo.createDocument(payload);
        set((state) => ({
            linkedDocumentsByTarget: {
                ...state.linkedDocumentsByTarget,
                [targetKey(payload.targetType, payload.targetId)]: updateTargetRows(
                    state.linkedDocumentsByTarget[targetKey(payload.targetType, payload.targetId)] ?? [],
                    response,
                ),
            },
        }));
        return response;
    },

    async addVersion(documentId, payload) {
        const response = await documentRepo.addVersion(documentId, payload);
        set((state) => ({
            linkedDocumentsByTarget: {
                ...state.linkedDocumentsByTarget,
                [targetKey(payload.targetType, payload.targetId)]: updateTargetRows(
                    state.linkedDocumentsByTarget[targetKey(payload.targetType, payload.targetId)] ?? [],
                    response,
                ),
            },
        }));
        return response;
    },

    async updateMetadata(documentId, payload) {
        const response = await documentRepo.updateMetadata(documentId, payload);
        set((state) => ({
            linkedDocumentsByTarget: {
                ...state.linkedDocumentsByTarget,
                [targetKey(payload.targetType, payload.targetId)]: updateTargetRows(
                    state.linkedDocumentsByTarget[targetKey(payload.targetType, payload.targetId)] ?? [],
                    response,
                ),
            },
        }));
        return response;
    },

    async documentLifecycle(documentId, action, payload) {
        const response = await documentRepo.documentLifecycle(documentId, action, payload);
        set((state) => ({
            linkedDocumentsByTarget: {
                ...state.linkedDocumentsByTarget,
                [targetKey(payload.targetType, payload.targetId)]: updateTargetRows(
                    state.linkedDocumentsByTarget[targetKey(payload.targetType, payload.targetId)] ?? [],
                    response,
                ),
            },
        }));
        return response;
    },

    async linkLifecycle(documentLinkId, action, payload) {
        const response = await documentRepo.linkLifecycle(documentLinkId, action, payload);
        set((state) => {
            const nextByTarget = Object.fromEntries(
                Object.entries(state.linkedDocumentsByTarget).map(([key, rows]) => [
                    key,
                    action === "delete"
                        ? rows.filter((row) => row.documentLinkId !== documentLinkId)
                        : updateTargetRows(rows, response),
                ]),
            );

            return { linkedDocumentsByTarget: nextByTarget };
        });
        return response;
    },

    async createDownloadAccess(documentVersionId) {
        return documentRepo.createDownloadAccess(documentVersionId);
    },

    reset() {
        set({
            linkedDocumentsByTarget: {},
            temporaryUploadsById: {},
            loading: false,
        });
    },
}));

export function getDocumentTargetKey(
    targetType: DocumentLinkTargetType,
    targetId: string | null | undefined,
): string | null {
    return targetId ? targetKey(targetType, targetId) : null;
}
