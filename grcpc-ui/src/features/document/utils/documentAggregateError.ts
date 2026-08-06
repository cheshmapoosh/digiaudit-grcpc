import { HttpError } from "@/shared/infra/http.client";
import type {
    DocumentAggregateDraftError,
    DocumentAggregateDraftType,
} from "../domain/document.model";

const DRAFT_TYPES = new Set<DocumentAggregateDraftType>([
    "NEW_DOCUMENT",
    "NEW_VERSION",
    "METADATA_UPDATE",
]);

function optionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value : undefined;
}

export function toDocumentAggregateDraftError(error: unknown): DocumentAggregateDraftError | null {
    if (!(error instanceof HttpError) || typeof error.data !== "object" || error.data === null) {
        return null;
    }
    const data = error.data as Record<string, unknown>;
    const draftType = optionalString(data.draftType) as DocumentAggregateDraftType | undefined;
    const code = optionalString(data.code) ?? error.code;
    const tempUploadId = optionalString(data.tempUploadId);
    const documentId = optionalString(data.documentId);
    if (!code || !draftType || !DRAFT_TYPES.has(draftType) || (!tempUploadId && !documentId)) {
        return null;
    }
    return { code, draftType, tempUploadId, documentId };
}
