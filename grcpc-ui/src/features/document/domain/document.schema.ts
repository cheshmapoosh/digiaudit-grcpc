import { z } from "zod";

const optionalDate = z.string().trim().nullable().optional();

export const documentAggregateRequestSchema = z.object({
    newDocuments: z.array(z.object({
        tempUploadId: z.string().trim().min(1),
        code: z.string().trim().nullable().optional(),
        title: z.string().trim().min(1).max(255),
        description: z.string().trim().nullable().optional(),
        validFrom: optionalDate,
        validTo: optionalDate,
    })),
    newVersions: z.array(z.object({
        documentId: z.string().trim().min(1),
        expectedDocumentVersion: z.number().int().min(0),
        tempUploadId: z.string().trim().min(1),
        validFrom: optionalDate,
        validTo: optionalDate,
    })),
    metadataUpdates: z.array(z.object({
        documentId: z.string().trim().min(1),
        expectedVersion: z.number().int().min(0),
        title: z.string().trim().min(1).max(255),
    })),
});
