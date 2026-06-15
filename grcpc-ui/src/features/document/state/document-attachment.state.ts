import { create } from "zustand";

import type {
    DocumentAttachment,
    DocumentCommitPayload,
    DocumentTempUploadPayload,
    DocumentUploadPayload,
    DocumentUploadPolicy,
} from "../domain/document.model";
import { DocumentApiRepo } from "../infra/document.api.repo";

const documentRepo = new DocumentApiRepo();

interface DocumentAttachmentState {
    documentsByTarget: Record<string, DocumentAttachment[]>;
    tempDocumentsBySession: Record<string, DocumentAttachment[]>;
    uploadPoliciesByTargetType: Record<string, DocumentUploadPolicy>;
    loading: boolean;

    loadForTarget(targetType: string, targetId: string): Promise<void>;
    loadTemp(targetType: string, tempSessionId: string): Promise<void>;
    loadUploadPolicy(targetType: string): Promise<DocumentUploadPolicy>;
    uploadTemp(
        payload: DocumentTempUploadPayload,
        onProgress?: (progress: number) => void,
    ): Promise<DocumentAttachment>;
    upload(
        payload: DocumentUploadPayload,
        onProgress?: (progress: number) => void,
    ): Promise<DocumentAttachment>;
    commitTemp(payload: DocumentCommitPayload): Promise<DocumentAttachment[]>;
    updateTitle(id: string, title: string): Promise<DocumentAttachment>;
    deleteDocument(id: string): Promise<void>;
    createDownloadUrl(id: string): Promise<string>;
    reset(): void;
}

function targetKey(targetType: string, targetId: string): string {
    return `${targetType}:${targetId}`;
}

function removeDocumentFromMap(
    map: Record<string, DocumentAttachment[]>,
    id: string,
): Record<string, DocumentAttachment[]> {
    return Object.fromEntries(
        Object.entries(map).map(([key, value]) => [
            key,
            value.filter((item) => item.id !== id),
        ]),
    );
}

function replaceDocumentInMap(
    map: Record<string, DocumentAttachment[]>,
    document: DocumentAttachment,
): Record<string, DocumentAttachment[]> {
    return Object.fromEntries(
        Object.entries(map).map(([key, value]) => [
            key,
            value.map((item) => (item.id === document.id ? document : item)),
        ]),
    );
}

export const useDocumentAttachmentState = create<DocumentAttachmentState>((set, get) => ({
    documentsByTarget: {},
    tempDocumentsBySession: {},
    uploadPoliciesByTargetType: {},
    loading: false,

    async loadForTarget(targetType, targetId) {
        set({ loading: true });

        try {
            const documents = await documentRepo.list(targetType, targetId);
            set((state) => ({
                documentsByTarget: {
                    ...state.documentsByTarget,
                    [targetKey(targetType, targetId)]: documents,
                },
            }));
        } finally {
            set({ loading: false });
        }
    },

    async loadTemp(targetType, tempSessionId) {
        set({ loading: true });

        try {
            const documents = await documentRepo.listTemp(targetType, tempSessionId);
            set((state) => ({
                tempDocumentsBySession: {
                    ...state.tempDocumentsBySession,
                    [tempSessionId]: documents,
                },
            }));
        } finally {
            set({ loading: false });
        }
    },

    async loadUploadPolicy(targetType) {
        const cached = get().uploadPoliciesByTargetType[targetType];
        if (cached) {
            return cached;
        }

        const policy = await documentRepo.uploadPolicy(targetType);
        set((state) => ({
            uploadPoliciesByTargetType: {
                ...state.uploadPoliciesByTargetType,
                [targetType]: policy,
            },
        }));
        return policy;
    },

    async uploadTemp(payload, onProgress) {
        const uploaded = await documentRepo.uploadTemp(payload, onProgress);
        set((state) => {
            const current = state.tempDocumentsBySession[payload.tempSessionId] ?? [];
            return {
                tempDocumentsBySession: {
                    ...state.tempDocumentsBySession,
                    [payload.tempSessionId]: [uploaded, ...current],
                },
            };
        });
        return uploaded;
    },

    async upload(payload, onProgress) {
        const uploaded = await documentRepo.upload(payload, onProgress);
        set((state) => {
            const activeKey = targetKey(payload.targetType, payload.targetId);
            const current = state.documentsByTarget[activeKey] ?? [];
            return {
                documentsByTarget: {
                    ...state.documentsByTarget,
                    [activeKey]: [uploaded, ...current],
                },
            };
        });
        return uploaded;
    },

    async commitTemp(payload) {
        const committed = await documentRepo.commitTemp(payload);
        set((state) => {
            const activeKey = targetKey(payload.targetType, payload.targetId);
            const active = state.documentsByTarget[activeKey] ?? [];
            const currentTemp = state.tempDocumentsBySession[payload.tempSessionId] ?? [];
            const committedTempIds = new Set(
                payload.documentIds && payload.documentIds.length > 0
                    ? payload.documentIds
                    : currentTemp.map((item) => item.id),
            );
            const remainingTemp = currentTemp.filter(
                (item) => !committedTempIds.has(item.id),
            );

            return {
                documentsByTarget: {
                    ...state.documentsByTarget,
                    [activeKey]: [...committed, ...active],
                },
                tempDocumentsBySession: {
                    ...state.tempDocumentsBySession,
                    [payload.tempSessionId]: remainingTemp,
                },
            };
        });
        return committed;
    },

    async updateTitle(id, title) {
        const updated = await documentRepo.updateTitle(id, title);
        set((state) => ({
            documentsByTarget: replaceDocumentInMap(state.documentsByTarget, updated),
            tempDocumentsBySession: replaceDocumentInMap(
                state.tempDocumentsBySession,
                updated,
            ),
        }));
        return updated;
    },

    async deleteDocument(id) {
        await documentRepo.delete(id);
        set((state) => ({
            documentsByTarget: removeDocumentFromMap(state.documentsByTarget, id),
            tempDocumentsBySession: removeDocumentFromMap(state.tempDocumentsBySession, id),
        }));
    },

    async createDownloadUrl(id) {
        const response = await documentRepo.createDownloadUrl(id);
        return response.url;
    },

    reset() {
        set({
            documentsByTarget: {},
            tempDocumentsBySession: {},
            uploadPoliciesByTargetType: {},
            loading: false,
        });
    },
}));
