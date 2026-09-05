import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";
import { documentAggregateRequestSchema } from "@/features/document/domain/document.schema";

export const processStatusSchema = z.enum(["ACTIVE", "INACTIVE", "DELETED"]);
export const processEditableStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

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

const optionalDateSchema = z
    .string()
    .trim()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
        message: t("process.validation.invalidDate", "Invalid date"),
    })
    .nullable()
    .optional();

const validitySchema = z
    .object({
        validFrom: optionalDateSchema,
        validTo: optionalDateSchema,
    })
    .refine(hasValidDateRange, {
        message: t("process.validation.invalidValidityRange", "بازه اعتبار معتبر نیست"),
    });

const controlScopeChangeSchema = z.object({
    operation: z.enum(["CREATE_OR_RESTORE", "UPDATE", "ACTIVATE", "INACTIVATE", "DELETE"]),
    controlId: z.string().trim().min(1),
    scopeId: z.string().trim().min(1).nullable().optional(),
    version: z.number().int().min(0).nullable().optional(),
    recommendedFrequencyCode: z.string().trim().nullable().optional(),
    recommendedExecutionMethodCode: z.string().trim().nullable().optional(),
    recommendedTestMethodCode: z.string().trim().nullable().optional(),
    validFrom: optionalDateSchema,
    validTo: optionalDateSchema,
    requestedStatus: processEditableStatusSchema.nullable().optional(),
});

const riskScopeChangeSchema = z.object({
    operation: z.enum(["CREATE_OR_RESTORE", "UPDATE", "ACTIVATE", "INACTIVATE", "DELETE"]),
    riskTemplateId: z.string().trim().min(1),
    scopeId: z.string().trim().min(1).nullable().optional(),
    version: z.number().int().min(0).nullable().optional(),
    validFrom: optionalDateSchema,
    validTo: optionalDateSchema,
    requestedStatus: processEditableStatusSchema.nullable().optional(),
});

const controlObjectiveScopeChangeSchema = z.object({
    operation: z.enum(["CREATE_OR_RESTORE", "UPDATE", "ACTIVATE", "INACTIVATE", "DELETE"]),
    controlObjectiveId: z.string().trim().min(1),
    scopeId: z.string().trim().min(1).nullable().optional(),
    version: z.number().int().min(0).nullable().optional(),
    validFrom: optionalDateSchema,
    validTo: optionalDateSchema,
    requestedStatus: processEditableStatusSchema.nullable().optional(),
});

const requirementScopeChangeSchema = z.object({
    operation: z.enum(["CREATE_OR_RESTORE", "UPDATE", "ACTIVATE", "INACTIVATE", "DELETE"]),
    requirementId: z.string().trim().min(1),
    scopeId: z.string().trim().min(1).nullable().optional(),
    version: z.number().int().min(0).nullable().optional(),
    validFrom: optionalDateSchema,
    validTo: optionalDateSchema,
    requestedStatus: processEditableStatusSchema.nullable().optional(),
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
    documents: documentAggregateRequestSchema,
    controlScopeChanges: z.array(controlScopeChangeSchema),
    riskScopeChanges: z.array(riskScopeChangeSchema),
    controlObjectiveScopeChanges: z.array(controlObjectiveScopeChangeSchema),
    requirementScopeChanges: z.array(requirementScopeChangeSchema),
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
    status: processEditableStatusSchema,
    parentId: z.string().trim().min(1).nullable().optional(),
    sortOrder: z.number().int().min(0).nullable().optional(),
    description: optionalTextSchema,
    documents: documentAggregateRequestSchema,
    controlScopeChanges: z.array(controlScopeChangeSchema),
    riskScopeChanges: z.array(riskScopeChangeSchema),
    controlObjectiveScopeChanges: z.array(controlObjectiveScopeChangeSchema),
    requirementScopeChanges: z.array(requirementScopeChangeSchema),
});

export const processLifecycleSchema = z.object({
    version: z.number().int().min(0),
});

export type ProcessCreateInput = z.infer<typeof processCreateSchema>;
export type ProcessUpdateInput = z.infer<typeof processUpdateSchema>;
