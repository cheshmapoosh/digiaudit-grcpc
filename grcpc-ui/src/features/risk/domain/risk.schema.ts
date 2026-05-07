import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const riskStatusSchema = z.enum(["active", "inactive"]);

export const riskNodeTypeSchema = z.enum(["riskCategory", "riskTemplate"]);

export const riskTemplateTypeSchema = z.enum([
    "operational",
    "financial",
    "strategic",
    "compliance",
    "technology",
    "reputation",
    "safety",
    "other",
]);

const optionalTextSchema = z
    .string()
    .trim()
    .max(
        2000,
        t(
            "risk.validation.textMaxLength",
            "متن نمی‌تواند بیشتر از 2000 کاراکتر باشد",
        ),
    )
    .optional();

const optionalShortTextSchema = z.string().trim().max(255).optional();

const riskEffectSchema = z.object({
    id: z.string().trim().min(1),
    effect: z.string().trim().min(1),
    effectCategory: z.string().trim().min(1),
    effectCategoryDescription: optionalTextSchema,
});

const baseRiskPayloadSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, t("risk.validation.codeRequired", "کد الزامی است"))
        .max(
            50,
            t(
                "risk.validation.codeMaxLength",
                "کد نمی‌تواند بیشتر از 50 کاراکتر باشد",
            ),
        ),

    title: z
        .string()
        .trim()
        .min(1, t("risk.validation.titleRequired", "نام الزامی است"))
        .max(
            255,
            t(
                "risk.validation.titleMaxLength",
                "نام نمی‌تواند بیشتر از 255 کاراکتر باشد",
            ),
        ),

    nodeType: riskNodeTypeSchema,
    parentId: z.string().trim().min(1).nullable(),
    status: riskStatusSchema,
    sortOrder: z.number().int().min(0).optional(),
    description: optionalTextSchema,

    validFrom: optionalShortTextSchema,
    validTo: optionalShortTextSchema,
    allowReference: z.boolean().optional(),
    analysisProfile: optionalShortTextSchema,
    ownerId: z.string().trim().min(1).nullable().optional(),
    ownerName: optionalShortTextSchema,
    documentsCount: z.number().int().min(0).optional(),

    companyOperation: optionalShortTextSchema,
    riskType: riskTemplateTypeSchema.optional(),
    causes: optionalTextSchema,
    effects: z.array(riskEffectSchema).optional(),
    existingRisksCount: z.number().int().min(0).optional(),
    responsePatternsCount: z.number().int().min(0).optional(),
    controlCentersCount: z.number().int().min(0).optional(),
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

export const riskCreateSchema = baseRiskPayloadSchema.extend({
    ...forbiddenReadonlyFields,
});

export const riskUpdateSchema = baseRiskPayloadSchema
    .partial()
    .extend({
        ...forbiddenReadonlyFields,
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: t(
            "risk.validation.updateAtLeastOneField",
            "حداقل یک فیلد برای بروزرسانی لازم است",
        ),
    });

export type RiskCreateInput = z.infer<typeof riskCreateSchema>;
export type RiskUpdateInput = z.infer<typeof riskUpdateSchema>;
