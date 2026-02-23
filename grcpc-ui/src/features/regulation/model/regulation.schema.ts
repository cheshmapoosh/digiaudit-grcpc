import { z } from "zod";

export const RegulationStatusSchema = z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]);

export const RegulationEntitySchema = z.object({
    id: z.string().min(1),
    code: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    parentId: z.string().nullable().optional(),
    status: RegulationStatusSchema,
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
});

export const RegulationUpsertInputSchema = z.object({
    code: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    parentId: z.string().nullable().optional(),
    status: RegulationStatusSchema,
});

export type RegulationEntityDto = z.infer<typeof RegulationEntitySchema>;
export type RegulationUpsertInputDto = z.infer<typeof RegulationUpsertInputSchema>;