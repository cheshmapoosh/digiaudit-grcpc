import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const processStatusSchema = z.enum(["ACTIVE", "INACTIVE", "DELETED"]);

export const processNodeTypeSchema = z.enum(["PROCESS", "SUBPROCESS"]);

function byteLength(value: string): number {
    return new TextEncoder().encode(value).length;
}

function hasValidDateRange(value: { validFrom?: string | null; validTo?: string | null }) {
    const validFrom = value.validFrom?.trim();
    const validTo = value.validTo?.trim();

    return !validFrom || !validTo || validFrom <= validTo;
}

const optionalTextSchema = z
    .string()
    .trim()
    .max(
        2000,
        t(
            "process.validation.textMaxLength",
            "متن نمی‌تواند بیشتر از 2000 کاراکتر باشد",
        ),
    )
    .nullable()
    .optional();

const validitySchema = z
    .object({
        validFrom: z.string().trim().nullable().optional(),
        validTo: z.string().trim().nullable().optional(),
    })
    .refine(hasValidDateRange, {
        message: t("process.validation.invalidValidityRange", "بازه اعتبار معتبر نیست"),
    });

const baseProcessPayloadSchema = validitySchema.extend({
    code: z
        .string()
        .trim()
        .min(1, t("process.validation.codeRequired", "کد الزامی است"))
        .refine((value) => byteLength(value) <= 64, {
            message: t(
                "process.validation.codeMaxBytes",
                "کد نمی‌تواند بیشتر از 64 بایت باشد",
            ),
        }),
    title: z
        .string()
        .trim()
        .min(1, t("process.validation.titleRequired", "نام الزامی است"))
        .max(
            255,
            t(
                "process.validation.titleMaxLength",
                "نام نمی‌تواند بیشتر از 255 کاراکتر باشد",
            ),
        ),
    nodeType: processNodeTypeSchema,
    parentId: z.string().trim().min(1).nullable().optional(),
    sortOrder: z.number().int().min(0).nullable().optional(),
    description: optionalTextSchema,
});

export const processCreateSchema = baseProcessPayloadSchema;

export const processUpdateSchema = validitySchema.extend({
    version: z.number().int().min(0),
    title: z
        .string()
        .trim()
        .min(1, t("process.validation.titleRequired", "نام الزامی است"))
        .max(
            255,
            t(
                "process.validation.titleMaxLength",
                "نام نمی‌تواند بیشتر از 255 کاراکتر باشد",
            ),
        ),
    sortOrder: z.number().int().min(0).nullable().optional(),
    description: optionalTextSchema,
});

export const processMoveSchema = z.object({
    parentId: z.string().trim().min(1).nullable().optional(),
    version: z.number().int().min(0),
});

export const processLifecycleSchema = z.object({
    version: z.number().int().min(0),
});

export type ProcessCreateInput = z.infer<typeof processCreateSchema>;
export type ProcessUpdateInput = z.infer<typeof processUpdateSchema>;
export type ProcessMoveInput = z.infer<typeof processMoveSchema>;
