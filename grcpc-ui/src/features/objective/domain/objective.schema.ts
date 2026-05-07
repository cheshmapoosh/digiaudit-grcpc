import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const objectiveStatusSchema = z.enum(["active", "inactive"]);

export const objectiveNodeTypeSchema = z.enum(["objective"]);

export const objectiveTypeSchema = z.enum([
    "operational",
    "compliance",
    "strategic",
    "financial",
    "reporting",
    "market",
]);

const optionalTextSchema = z
    .string()
    .trim()
    .max(
        2000,
        t(
            "objective.validation.textMaxLength",
            "متن نمی‌تواند بیشتر از 2000 کاراکتر باشد",
        ),
    )
    .optional();

const optionalShortTextSchema = z.string().trim().max(255).optional();

const optionalDateTextSchema = z.string().trim().max(32).optional();

const baseObjectivePayloadSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, t("objective.validation.codeRequired", "کد الزامی است"))
        .max(
            50,
            t(
                "objective.validation.codeMaxLength",
                "کد نمی‌تواند بیشتر از 50 کاراکتر باشد",
            ),
        ),

    title: z
        .string()
        .trim()
        .min(1, t("objective.validation.titleRequired", "نام الزامی است"))
        .max(
            255,
            t(
                "objective.validation.titleMaxLength",
                "نام نمی‌تواند بیشتر از 255 کاراکتر باشد",
            ),
        ),

    nodeType: objectiveNodeTypeSchema,

    parentId: z.string().trim().min(1).nullable(),

    status: objectiveStatusSchema,

    sortOrder: z.number().int().min(0).optional(),

    description: optionalTextSchema,
    strategy: optionalTextSchema,
    objectiveType: objectiveTypeSchema.optional(),
    objectiveClass: optionalShortTextSchema,
    organizationUnitId: z.string().trim().min(1).nullable().optional(),
    organizationUnitName: optionalShortTextSchema,
    effectiveFrom: optionalDateTextSchema,
    validUntil: optionalDateTextSchema,
    documentsCount: z.number().int().min(0).optional(),
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

export const objectiveCreateSchema = baseObjectivePayloadSchema.extend({
    ...forbiddenReadonlyFields,
});

export const objectiveUpdateSchema = baseObjectivePayloadSchema
    .partial()
    .extend({
        ...forbiddenReadonlyFields,
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: t(
            "objective.validation.updateAtLeastOneField",
            "حداقل یک فیلد برای بروزرسانی لازم است",
        ),
    });

export type ObjectiveCreateInput = z.infer<typeof objectiveCreateSchema>;
export type ObjectiveUpdateInput = z.infer<typeof objectiveUpdateSchema>;
