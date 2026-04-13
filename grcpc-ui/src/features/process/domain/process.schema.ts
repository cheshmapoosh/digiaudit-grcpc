import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const processStatusSchema = z.enum(["active", "inactive"]);

const baseProcessPayloadSchema = z.object({
    code: z
        .string()
        .trim()
        .min(
            1,
            t("process.validation.codeRequired", "کد الزامی است"),
        )
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
        .min(
            1,
            t("process.validation.titleRequired", "عنوان الزامی است"),
        )
        .max(
            255,
            t(
                "process.validation.titleMaxLength",
                "عنوان نمی‌تواند بیشتر از 255 کاراکتر باشد",
            ),
        ),

    description: z
        .string()
        .trim()
        .max(
            2000,
            t(
                "process.validation.descriptionMaxLength",
                "توضیحات نمی‌تواند بیشتر از 2000 کاراکتر باشد",
            ),
        )
        .optional(),

    parentId: z.string().trim().min(1).nullable(),

    ownerId: z.string().trim().min(1).nullable().optional(),

    sortOrder: z
        .number()
        .int()
        .min(
            0,
            t(
                "process.validation.sortOrderMin",
                "ترتیب باید بزرگتر یا مساوی صفر باشد",
            ),
        ),

    status: processStatusSchema,
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