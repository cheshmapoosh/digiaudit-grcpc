import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const policyStatusSchema = z.enum([
    "draft",
    "underReview",
    "pendingApproval",
    "approved",
    "inactive",
]);

export const policyNodeTypeSchema = z.enum(["policyGroup", "policy"]);

export const policyCategorySchema = z.enum([
    "hr",
    "accounting",
    "purchase",
    "it",
    "finance",
    "compliance",
    "other",
]);

export const policyKindSchema = z.enum([
    "policy",
    "procedure",
    "announcement",
    "workInstruction",
]);

export const policyCommunicationMethodSchema = z.enum([
    "announcement",
    "questionnaire",
    "survey",
]);

const optionalTextSchema = z
    .string()
    .trim()
    .max(
        2000,
        t(
            "policy.validation.textMaxLength",
            "متن نمی‌تواند بیشتر از 2000 کاراکتر باشد",
        ),
    )
    .optional();

const optionalShortTextSchema = z.string().trim().max(255).optional();

const basePolicyPayloadSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, t("policy.validation.codeRequired", "کد الزامی است"))
        .max(
            50,
            t(
                "policy.validation.codeMaxLength",
                "کد نمی‌تواند بیشتر از 50 کاراکتر باشد",
            ),
        ),

    title: z
        .string()
        .trim()
        .min(1, t("policy.validation.titleRequired", "نام الزامی است"))
        .max(
            255,
            t(
                "policy.validation.titleMaxLength",
                "نام نمی‌تواند بیشتر از 255 کاراکتر باشد",
            ),
        ),

    nodeType: policyNodeTypeSchema,

    parentId: z.string().trim().min(1).nullable(),

    status: policyStatusSchema,

    sortOrder: z.number().int().min(0).optional(),

    description: optionalTextSchema,

    policyCategory: policyCategorySchema.optional(),
    policyKind: policyKindSchema.optional(),
    ownerId: z.string().trim().min(1).nullable().optional(),
    ownerName: optionalShortTextSchema,
    ownerOrganization: optionalShortTextSchema,
    creatorName: optionalShortTextSchema,
    documentsCount: z.number().int().min(0).optional(),

    version: optionalShortTextSchema,
    validFrom: optionalShortTextSchema,
    validTo: optionalShortTextSchema,
    nextReviewDate: optionalShortTextSchema,
    communicationMethod: policyCommunicationMethodSchema.optional(),
    communicationLanguage: optionalShortTextSchema,
    objective: optionalTextSchema,
    note: optionalTextSchema,
    evaluationConfirmed: z.boolean().optional(),
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

export const policyCreateSchema = basePolicyPayloadSchema.extend({
    ...forbiddenReadonlyFields,
});

export const policyUpdateSchema = basePolicyPayloadSchema
    .partial()
    .extend({
        ...forbiddenReadonlyFields,
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: t(
            "policy.validation.updateAtLeastOneField",
            "حداقل یک فیلد برای بروزرسانی لازم است",
        ),
    });

export type PolicyCreateInput = z.infer<typeof policyCreateSchema>;
export type PolicyUpdateInput = z.infer<typeof policyUpdateSchema>;
