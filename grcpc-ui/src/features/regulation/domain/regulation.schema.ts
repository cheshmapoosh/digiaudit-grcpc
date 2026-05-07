import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const regulationStatusSchema = z.enum(["active", "inactive"]);

export const regulationNodeTypeSchema = z.enum([
    "lawGroup",
    "law",
    "lawRequirement",
]);

const optionalTextSchema = z
    .string()
    .trim()
    .max(
        2000,
        t(
            "regulation.validation.textMaxLength",
            "متن نمی‌تواند بیشتر از 2000 کاراکتر باشد",
        ),
    )
    .optional();

const optionalShortTextSchema = z.string().trim().max(255).optional();

const baseRegulationPayloadSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, t("regulation.validation.codeRequired", "کد الزامی است"))
        .max(
            50,
            t(
                "regulation.validation.codeMaxLength",
                "کد نمی‌تواند بیشتر از 50 کاراکتر باشد",
            ),
        ),

    title: z
        .string()
        .trim()
        .min(1, t("regulation.validation.titleRequired", "نام الزامی است"))
        .max(
            255,
            t(
                "regulation.validation.titleMaxLength",
                "نام نمی‌تواند بیشتر از 255 کاراکتر باشد",
            ),
        ),

    nodeType: regulationNodeTypeSchema,
    parentId: z.string().trim().min(1).nullable(),
    status: regulationStatusSchema,
    sortOrder: z.number().int().min(0).optional(),
    description: optionalTextSchema,
    effectiveDate: optionalShortTextSchema,
    validTo: optionalShortTextSchema,
    issuer: optionalShortTextSchema,
    ownerName: optionalShortTextSchema,
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

export const regulationCreateSchema = baseRegulationPayloadSchema.extend({
    ...forbiddenReadonlyFields,
});

export const regulationUpdateSchema = baseRegulationPayloadSchema
    .partial()
    .extend({
        ...forbiddenReadonlyFields,
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: t(
            "regulation.validation.updateAtLeastOneField",
            "حداقل یک فیلد برای بروزرسانی لازم است",
        ),
    });

export type RegulationCreateInput = z.infer<typeof regulationCreateSchema>;
export type RegulationUpdateInput = z.infer<typeof regulationUpdateSchema>;
