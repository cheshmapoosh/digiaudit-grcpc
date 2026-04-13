import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const organizationStatusSchema = z.enum(["active", "inactive"]);

export const organizationTypeSchema = z.enum([
    "company",
    "holding",
    "department",
    "management",
    "branch",
    "unit",
    "other",
]);

const baseOrganizationPayloadSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, t("organization.validation.codeRequired", "کد الزامی است"))
        .max(
            50,
            t(
                "organization.validation.codeMaxLength",
                "کد نمی‌تواند بیشتر از 50 کاراکتر باشد",
            ),
        ),

    name: z
        .string()
        .trim()
        .min(1, t("organization.validation.nameRequired", "نام الزامی است"))
        .max(
            255,
            t(
                "organization.validation.nameMaxLength",
                "نام نمی‌تواند بیشتر از 255 کاراکتر باشد",
            ),
        ),

    type: organizationTypeSchema,

    parentId: z.string().trim().min(1).nullable(),

    status: organizationStatusSchema,

    validFrom: z.string().trim().optional(),

    validTo: z.string().trim().optional(),

    description: z
        .string()
        .trim()
        .max(
            2000,
            t(
                "organization.validation.descriptionMaxLength",
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

export const organizationCreateSchema = baseOrganizationPayloadSchema.extend({
    ...forbiddenReadonlyFields,
});

export const organizationUpdateSchema = baseOrganizationPayloadSchema
    .partial()
    .extend({
        ...forbiddenReadonlyFields,
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: t(
            "organization.validation.updateAtLeastOneField",
            "حداقل یک فیلد برای بروزرسانی لازم است",
        ),
    });

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;