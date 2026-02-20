import { z } from "zod";

export const ProcessNodeStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const ProcessNodeSchema = z.object({
    id: z.string(),
    parentId: z.string().nullable(),

    title: z.string().min(1),
    code: z.string().optional(),
    description: z.string().optional(),

    status: ProcessNodeStatusSchema,

    order: z.number().int().nonnegative(),
    depth: z.number().int().nonnegative().optional(),
    path: z.string().optional(),

    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});

export type ProcessNode = z.infer<typeof ProcessNodeSchema>;
