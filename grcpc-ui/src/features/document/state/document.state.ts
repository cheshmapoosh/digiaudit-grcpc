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
const targetLoadGenerations = new Map<string, number>();
const activeTargetLoads = new Map<number, string>();
let nextTargetLoadToken = 0;
let resetGeneration = 0;

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

function invalidateTargetLoads(key: string): number {
    const generation = (targetLoadGenerations.get(key) ?? 0) + 1;
    targetLoadGenerations.set(key, generation);
    for (const [token, activeKey] of activeTargetLoads) {
        if (activeKey === key) {
            activeTargetLoads.delete(token);
        }
    }
    return generation;
}

function invalidateAllTargetLoads(): void {
    resetGeneration += 1;
    targetLoadGenerations.clear();
    activeTargetLoads.clear();
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
        const key = targetKey(targetType, targetId);
        invalidateTargetLoads(key);
        set((state) => {
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
                loading: activeTargetLoads.size > 0,
            };
        });
    },

    async loadForTarget(targetType, targetId) {
        const key = targetKey(targetType, targetId);
        const generation = invalidateTargetLoads(key);
        const capturedResetGeneration = resetGeneration;
        const token = ++nextTargetLoadToken;
        activeTargetLoads.set(token, key);
        set({ loading: true });

        try {
            const rows = await documentRepo.listByTarget(targetType, targetId);
            if (capturedResetGeneration !== resetGeneration
                || targetLoadGenerations.get(key) !== generation
                || activeTargetLoads.get(token) !== key) {
                return;
            }
            set((state) => ({
                linkedDocumentsByTarget: {
                    ...state.linkedDocumentsByTarget,
                    [key]: rows,
                },
            }));
        } finally {
            activeTargetLoads.delete(token);
            set({ loading: activeTargetLoads.size > 0 });
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
        const key = targetKey(payload.targetType, payload.targetId);
        invalidateTargetLoads(key);
        set((state) => ({
            linkedDocumentsByTarget: {
                ...state.linkedDocumentsByTarget,
                [key]: updateTargetRows(
                    state.linkedDocumentsByTarget[key] ?? [],
                    response,
                ),
            },
            temporaryUploadsById: removeTemporaryUpload(
                state.temporaryUploadsById,
                payload.tempUploadId,
            ),
            loading: activeTargetLoads.size > 0,
        }));
        return response;
    },

    async addVersion(documentId, payload) {
        const response = await documentRepo.addVersion(documentId, payload);
        const key = targetKey(payload.targetType, payload.targetId);
        invalidateTargetLoads(key);
        set((state) => ({
            linkedDocumentsByTarget: {
                ...state.linkedDocumentsByTarget,
                [key]: updateTargetRows(
                    state.linkedDocumentsByTarget[key] ?? [],
                    response,
                ),
            },
            temporaryUploadsById: removeTemporaryUpload(
                state.temporaryUploadsById,
                payload.tempUploadId,
            ),
            loading: activeTargetLoads.size > 0,
        }));
        return response;
    },

    async updateMetadata(documentId, payload) {
        const response = await documentRepo.updateMetadata(documentId, payload);
        const key = targetKey(payload.targetType, payload.targetId);
        invalidateTargetLoads(key);
        set((state) => ({
            linkedDocumentsByTarget: {
                ...state.linkedDocumentsByTarget,
                [key]: updateDocumentRows(
                    updateTargetRows(
                        state.linkedDocumentsByTarget[key] ?? [],
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
            loading: activeTargetLoads.size > 0,
        }));
        return response;
    },

    async documentLifecycle(documentId, action, payload) {
        const response = await documentRepo.documentLifecycle(documentId, action, payload);
        const nextStatus = lifecycleStatusForAction(action);
        const key = targetKey(payload.targetType, payload.targetId);
        invalidateTargetLoads(key);
        set((state) => ({
            linkedDocumentsByTarget: {
                ...state.linkedDocumentsByTarget,
                [key]: action === "delete"
                    ? (state.linkedDocumentsByTarget[key] ?? [])
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
            loading: activeTargetLoads.size > 0,
        }));
        return response;
    },

    async linkLifecycle(documentLinkId, action, payload) {
        const response = await documentRepo.linkLifecycle(documentLinkId, action, payload);
        invalidateAllTargetLoads();
        set((state) => {
            const nextByTarget = Object.fromEntries(
                Object.entries(state.linkedDocumentsByTarget).map(([key, rows]) => [
                    key,
                    action === "delete"
                        ? rows.filter((row) => row.documentLinkId !== documentLinkId)
                        : updateTargetRows(rows, response),
                ]),
            );

            return { linkedDocumentsByTarget: nextByTarget, loading: false };
        });
        return response;
    },

    async createDownloadAccess(documentVersionId) {
        return documentRepo.createDownloadAccess(documentVersionId);
    },

    reset() {
        invalidateAllTargetLoads();
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
