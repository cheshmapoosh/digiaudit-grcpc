import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const processStatusSchema = z.enum(["active", "inactive"]);

export const processNodeTypeSchema = z.enum(["process", "subProcess", "control"]);

export const processCategorySchema = z.enum([
    "operational",
    "support",
    "strategic",
    "financial",
    "compliance",
    "it",
    "other",
]);

export const controlImportanceSchema = z.enum([
    "low",
    "medium",
    "high",
    "critical",
]);

export const controlAutomationSchema = z.enum([
    "manual",
    "automated",
    "semiAutomated",
]);

const optionalTextSchema = z
    .string()
    .trim()
    .max(
        2000,
        t(
            "process.validation.textMaxLength",
            "متن نمی‌تواند بیشتر از 2000 کاراکتر باشد",
        ),
    )
    .optional();

const baseProcessPayloadSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, t("process.validation.codeRequired", "کد الزامی است"))
        .max(
            50,
            t(
                "process.validation.codeMaxLength",
                "کد نمی‌تواند بیشتر از 50 کاراکتر باشد",
            ),
        ),

    title: z
        .string()
        .trim()
        .min(1, t("process.validation.titleRequired", "نام الزامی است"))
        .max(
            255,
            t(
                "process.validation.titleMaxLength",
                "نام نمی‌تواند بیشتر از 255 کاراکتر باشد",
            ),
        ),

    nodeType: processNodeTypeSchema,

    parentId: z.string().trim().min(1).nullable(),

    status: processStatusSchema,

    sortOrder: z.number().int().min(0).optional(),

    description: optionalTextSchema,

    processCategory: processCategorySchema.optional(),
    ownerId: z.string().trim().min(1).nullable().optional(),
    ownerName: z.string().trim().max(255).optional(),
    documentsCount: z.number().int().min(0).optional(),

    objective: optionalTextSchema,
    operationCycle: z.string().trim().max(255).optional(),

    controlAutomation: controlAutomationSchema.optional(),
    controlFrequency: z.string().trim().max(255).optional(),
    controlClassification: z.string().trim().max(255).optional(),
    controlOwner: z.string().trim().max(255).optional(),
    testDirection: z.string().trim().max(255).optional(),
    testType: z.string().trim().max(255).optional(),
    testProgram: optionalTextSchema,
    importance: controlImportanceSchema.optional(),
});

const forbiddenReadonlyFields = {
    id: z.never().optional(),
    createdAt: z.never().optional(),
    updatedAt: z.never().optional(),
    createdBy: z.never().optional(),
    updatedBy: z.never().optional(),
    deletedAt: z.never().optional(),
    deletedBy: z.never().optional(),
};

export const processCreateSchema = baseProcessPayloadSchema.extend({
    ...forbiddenReadonlyFields,
});

export const processUpdateSchema = baseProcessPayloadSchema
    .partial()
    .extend({
        ...forbiddenReadonlyFields,
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: t(
            "process.validation.updateAtLeastOneField",
            "حداقل یک فیلد برای بروزرسانی لازم است",
        ),
    });

export type ProcessCreateInput = z.infer<typeof processCreateSchema>;
export type ProcessUpdateInput = z.infer<typeof processUpdateSchema>;
