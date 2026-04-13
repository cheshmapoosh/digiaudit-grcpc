import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const regulationStatusSchema = z.enum(["active", "inactive"]);

export const regulationTypeSchema = z.enum([
    "law",
    "regulation",
    "directive",
    "circular",
    "procedure",
    "instruction",
    "policy",
    "other",
]);

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

    name: z
        .string()
        .trim()
        .min(1, t("regulation.validation.nameRequired", "نام الزامی است"))
        .max(
            255,
            t(
                "regulation.validation.nameMaxLength",
                "نام نمی‌تواند بیشتر از 255 کاراکتر باشد",
            ),
        ),

    type: regulationTypeSchema,

    parentId: z.string().trim().min(1).nullable(),

    status: regulationStatusSchema,

    validFrom: z.string().trim().optional(),

    validTo: z.string().trim().optional(),

    description: z
        .string()
        .trim()
        .max(
            2000,
            t(
                "regulation.validation.descriptionMaxLength",
                "توضیحات نمی‌تواند بیشتر از 2000 کاراکتر باشد",
            ),
        )
        .optional(),
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
