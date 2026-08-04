export type {
    DocumentAddVersionPayload,
    DocumentCommandResponse,
    DocumentCreatePayload,
    DocumentDownloadAccess,
    DocumentLifecyclePayload,
    DocumentLifecycleStatus,
    DocumentLinkLifecyclePayload,
    DocumentLinkSummary,
    DocumentLinkTargetType,
    DocumentMetadataUpdatePayload,
    DocumentTemporaryUpload,
    DocumentAggregateRequest,
    ParentSaveDocumentDraftState,
    ParentSaveDocumentMetadataDraft,
    ParentSaveNewDocumentDraft,
    ParentSaveNewDocumentVersionDraft,
} from "./domain/document.model";
export {
    DOCUMENT_LINK_TARGET_TYPES,
    EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
    toDocumentAggregateRequest,
} from "./domain/document.model";
export { default as DocumentManager } from "./components/DocumentManager";
export { default as DocumentIntegrationDeferredMessage } from "./components/DocumentIntegrationDeferredMessage";
export { getDocumentTargetKey, useDocumentState } from "./state/document.state";
