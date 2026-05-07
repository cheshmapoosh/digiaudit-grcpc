import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const accountGroupStatusSchema = z.enum(["active", "inactive"]);

export const accountGroupImportanceSchema = z.enum([
    "low",
    "medium",
    "high",
    "critical",
]);

export const accountGroupAssertionsSchema = z.object({
    existence: z.boolean(),
    completeness: z.boolean(),
    valuation: z.boolean(),
    disclosure: z.boolean(),
});

export const accountGroupObjectiveSchema = z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).optional(),
});

export const accountRangeSchema = z.object({
    id: z.string().trim().min(1),
    fromAccount: z.string().trim().min(1).max(50),
    toAccount: z.string().trim().min(1).max(50),
    description: z.string().trim().max(2000).optional(),
});

export const accountGroupRiskSchema = z.object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).optional(),
    source: z.string().trim().max(255).optional(),
});

const optionalTextSchema = z
    .string()
    .trim()
    .max(
        2000,
        t(
            "accountGroup.validation.textMaxLength",
            "متن نمی‌تواند بیشتر از 2000 کاراکتر باشد",
        ),
    )
    .optional();

const baseAccountGroupPayloadSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, t("accountGroup.validation.codeRequired", "کد الزامی است"))
        .max(
            50,
            t(
                "accountGroup.validation.codeMaxLength",
                "کد نمی‌تواند بیشتر از 50 کاراکتر باشد",
            ),
        ),

    title: z
        .string()
        .trim()
        .min(1, t("accountGroup.validation.titleRequired", "نام الزامی است"))
        .max(
            255,
            t(
                "accountGroup.validation.titleMaxLength",
                "نام نمی‌تواند بیشتر از 255 کاراکتر باشد",
            ),
        ),

    parentId: z.string().trim().min(1).nullable(),

    status: accountGroupStatusSchema,

    sortOrder: z.number().int().min(0).optional(),

    description: optionalTextSchema,

    importance: accountGroupImportanceSchema.optional(),
    reasonableAssurance: z.boolean().optional(),
    effectiveDate: z.string().trim().max(50).optional(),
    documentsCount: z.number().int().min(0).optional(),

    assertions: accountGroupAssertionsSchema.optional(),
    objectives: z.array(accountGroupObjectiveSchema).optional(),
    accountRanges: z.array(accountRangeSchema).optional(),
    risks: z.array(accountGroupRiskSchema).optional(),
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

export const accountGroupCreateSchema = baseAccountGroupPayloadSchema.extend({
    ...forbiddenReadonlyFields,
});

export const accountGroupUpdateSchema = baseAccountGroupPayloadSchema
    .partial()
    .extend({
        ...forbiddenReadonlyFields,
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: t(
            "accountGroup.validation.updateAtLeastOneField",
            "حداقل یک فیلد برای بروزرسانی لازم است",
        ),
    });

export type AccountGroupCreateInput = z.infer<typeof accountGroupCreateSchema>;
export type AccountGroupUpdateInput = z.infer<typeof accountGroupUpdateSchema>;
