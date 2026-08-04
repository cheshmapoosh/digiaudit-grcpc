import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";
import { ORGANIZATION_TYPES } from "./organization.model";
import { documentAggregateRequestSchema } from "@/features/document/domain/document.schema";

export const organizationStatusSchema = z.enum(["ACTIVE", "INACTIVE", "DELETED"]);
export const organizationEditableStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export const organizationTypeSchema = z.enum(ORGANIZATION_TYPES);

const dateSchema = z
    .string()
    .trim()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
        message: t("organization.validation.invalidDate", "Invalid date"),
    })
    .nullable()
    .optional();

const nameSchema = z
    .string()
    .trim()
    .min(1, t("organization.validation.nameRequired", "Name is required"))
    .max(255, t("organization.validation.nameMaxLength", "Name cannot exceed 255 characters"));

const optionalLocationSchema = z
    .string()
    .trim()
    .max(255, t("organization.validation.locationMaxLength", "Location cannot exceed 255 characters"))
    .nullable()
    .optional();

const optionalDescriptionSchema = z.string().trim().nullable().optional();

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
    name: nameSchema,
    organizationType: organizationTypeSchema,
    parentOrganizationId: z.string().trim().min(1).nullable().optional(),
    location: optionalLocationSchema,
    description: optionalDescriptionSchema,
    documents: documentAggregateRequestSchema,
});

export const organizationUpdateSchema = baseValiditySchema.extend({
    version: z.number().int().min(0),
    name: nameSchema,
    organizationType: organizationTypeSchema,
    status: organizationEditableStatusSchema,
    parentOrganizationId: z.string().trim().min(1).nullable().optional(),
    location: optionalLocationSchema,
    description: optionalDescriptionSchema,
    documents: documentAggregateRequestSchema,
});

export const organizationLifecycleSchema = z.object({
    version: z.number().int().min(0),
});

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;
