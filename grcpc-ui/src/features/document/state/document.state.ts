import { create } from "zustand";

import type {
    DocumentAddVersionPayload,
    DocumentCommandResponse,
    DocumentCreatePayload,
    DocumentDetail,
    DocumentDownloadAccess,
    DocumentLifecyclePayload,
    DocumentLinkLifecyclePayload,
    DocumentLinkSummary,
    DocumentLinkTargetType,
    DocumentMetadataUpdatePayload,
    DocumentTemporaryUpload,
    DocumentVersion,
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
    getDocument(documentId: string): Promise<DocumentDetail>;
    listVersions(documentId: string): Promise<DocumentVersion[]>;
    getVersion(documentVersionId: string): Promise<DocumentVersion>;
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
    applyAggregateResults(
        targetType: DocumentLinkTargetType,
        targetId: string,
        responses: DocumentCommandResponse[],
        consumedTempUploadIds: string[],
    ): void;
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

function removeTemporaryUpload(
    uploads: Record<string, DocumentTemporaryUpload>,
    tempUploadId: string,
): Record<string, DocumentTemporaryUpload> {
    const nextUploads = { ...uploads };
    delete nextUploads[tempUploadId];
    return nextUploads;
}

function updateDocumentRows(
    rows: DocumentLinkSummary[],
    documentId: string,
    patch: Partial<DocumentLinkSummary>,
): DocumentLinkSummary[] {
    return rows.map((row) =>
        row.documentId === documentId
            ? {
                  ...row,
                  ...patch,
              }
            : row,
    );
}

function lifecycleStatusForAction(
    action: "activate" | "inactivate" | "delete" | "restore",
): "ACTIVE" | "INACTIVE" | "DELETED" {
    if (action === "delete") {
        return "DELETED";
    }

    if (action === "inactivate") {
        return "INACTIVE";
    }

    return "ACTIVE";
}

export const useDocumentState = create<DocumentState>((set) => ({
    linkedDocumentsByTarget: {},
    temporaryUploadsById: {},
    loading: false,

    applyAggregateResults(targetType, targetId, responses, consumedTempUploadIds) {
        set((state) => {
            const key = targetKey(targetType, targetId);
            const rows = responses.reduce(updateTargetRows, state.linkedDocumentsByTarget[key] ?? []);
            const temporaryUploadsById = consumedTempUploadIds.reduce(
                removeTemporaryUpload,
                state.temporaryUploadsById,
            );
            return {
                linkedDocumentsByTarget: {
                    ...state.linkedDocumentsByTarget,
                    [key]: rows,
                },
                temporaryUploadsById,
            };
        });
    },

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

    async getDocument(documentId) {
        return documentRepo.getDocument(documentId);
    },

    async listVersions(documentId) {
        return documentRepo.listVersions(documentId);
    },

    async getVersion(documentVersionId) {
        return documentRepo.getVersion(documentVersionId);
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
            temporaryUploadsById: removeTemporaryUpload(
                state.temporaryUploadsById,
                payload.tempUploadId,
            ),
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
            temporaryUploadsById: removeTemporaryUpload(
                state.temporaryUploadsById,
                payload.tempUploadId,
            ),
        }));
        return response;
    },

    async updateMetadata(documentId, payload) {
        const response = await documentRepo.updateMetadata(documentId, payload);
        set((state) => ({
            linkedDocumentsByTarget: {
                ...state.linkedDocumentsByTarget,
                [targetKey(payload.targetType, payload.targetId)]: updateDocumentRows(
                    updateTargetRows(
                        state.linkedDocumentsByTarget[targetKey(payload.targetType, payload.targetId)] ?? [],
                        response,
                    ),
                    documentId,
                    {
                        documentVersion: response.documentVersion,
                        ...(payload.code !== undefined ? { code: payload.code } : {}),
                        ...(payload.title !== undefined && payload.title !== null ? { title: payload.title } : {}),
                        ...(payload.description !== undefined ? { description: payload.description } : {}),
                        ...(payload.documentCategoryCode !== undefined
                            ? { documentCategoryCode: payload.documentCategoryCode }
                            : {}),
                    },
                ),
            },
        }));
        return response;
    },

    async documentLifecycle(documentId, action, payload) {
        const response = await documentRepo.documentLifecycle(documentId, action, payload);
        const nextStatus = lifecycleStatusForAction(action);
        set((state) => ({
            linkedDocumentsByTarget: {
                ...state.linkedDocumentsByTarget,
                [targetKey(payload.targetType, payload.targetId)]: action === "delete"
                    ? (state.linkedDocumentsByTarget[targetKey(payload.targetType, payload.targetId)] ?? [])
                          .filter((row) => row.documentId !== documentId)
                    : updateDocumentRows(
                          updateTargetRows(
                              state.linkedDocumentsByTarget[targetKey(payload.targetType, payload.targetId)] ?? [],
                              response,
                          ),
                          documentId,
                          {
                              documentVersion: response.documentVersion,
                              documentStatus: nextStatus,
                          },
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
