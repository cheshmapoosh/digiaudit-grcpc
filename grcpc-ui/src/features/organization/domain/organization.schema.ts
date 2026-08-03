import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const organizationStatusSchema = z.enum(["ACTIVE", "INACTIVE", "DELETED"]);

const dateSchema = z.string().trim().nullable().optional();

function byteLength(value: string): number {
    return new TextEncoder().encode(value).length;
}

function hasValidDateRange(value: { validFrom?: string | null; validTo?: string | null }) {
    const validFrom = value.validFrom?.trim();
    const validTo = value.validTo?.trim();

    return !validFrom || !validTo || validFrom <= validTo;
}

const baseValiditySchema = z
    .object({
        validFrom: dateSchema,
        validTo: dateSchema,
    })
    .refine(hasValidDateRange, {
        message: t(
            "organization.validation.invalidValidityRange",
            "بازه اعتبار معتبر نیست",
        ),
    });

export const organizationCreateSchema = baseValiditySchema.extend({
    code: z
        .string()
        .trim()
        .min(1, t("organization.validation.codeRequired", "کد الزامی است"))
        .refine((value) => byteLength(value) <= 64, {
            message: t(
                "organization.validation.codeMaxBytes",
                "کد نمی‌تواند بیشتر از 64 بایت باشد",
            ),
        }),
    parentOrganizationId: z.string().trim().min(1).nullable().optional(),
});

export const organizationUpdateSchema = baseValiditySchema.extend({
    version: z.number().int().min(0),
});

export const organizationMoveSchema = z.object({
    parentOrganizationId: z.string().trim().min(1).nullable().optional(),
    version: z.number().int().min(0),
});

export const organizationLifecycleSchema = z.object({
    version: z.number().int().min(0),
});

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;
export type OrganizationMoveInput = z.infer<typeof organizationMoveSchema>;
