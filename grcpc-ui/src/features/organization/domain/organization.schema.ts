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

const ownerChangeSchema = z.object({
    operation: z.enum(["CREATE_OR_RESTORE", "ACTIVATE", "INACTIVATE", "DELETE", "RESTORE"]), userId: z.string().uuid(),
    assignmentId: z.string().trim().min(1).optional(), version: z.number().int().min(0).optional(),
});
const subprocessChangeSchema = z.object({
    subprocessId: z.string().uuid(),
    operation: z.enum(["CREATE_OR_RESTORE", "ACTIVATE", "INACTIVATE", "DELETE"]),
    contextId: z.string().uuid().optional(),
    version: z.number().int().min(0).optional(),
});

const relationOperationSchema = z.enum(["CREATE_OR_RESTORE", "UPDATE", "ACTIVATE", "INACTIVATE", "DELETE", "RESTORE"]);
const optionalUuid = z.string().uuid().nullable().optional();
const contextRefSchema = z.object({ contextId: optionalUuid, subprocessId: optionalUuid })
    .refine(value => Boolean(value.contextId) !== Boolean(value.subprocessId));
const controlScopeRefSchema = z.object({ localControlScopeId: optionalUuid, contextRef: contextRefSchema.optional(), controlId: z.string().uuid().optional() })
    .refine(value => Boolean(value.localControlScopeId) !== Boolean(value.contextRef && value.controlId));
const requirementScopeRefSchema = z.object({ localRequirementScopeId: optionalUuid, contextRef: contextRefSchema.optional(), requirementId: z.string().uuid().optional() })
    .refine(value => Boolean(value.localRequirementScopeId) !== Boolean(value.contextRef && value.requirementId));
const relationChangeShape = { operation: relationOperationSchema, version: z.number().int().min(0).optional(), validFrom: dateSchema, validTo: dateSchema, requestedStatus: organizationEditableStatusSchema.optional() };
const sourcedChangeShape = { ...relationChangeShape, contextRef: contextRefSchema, scopeId: z.string().uuid().optional(), sourceType: z.enum(["LOCAL_ADDED", "INHERITED_FROM_CENTRAL"]).optional() };
const policyChangeShape = { ...relationChangeShape, policyId: z.string().uuid(), relationId: z.string().uuid().optional(), scopeAction: z.enum(["INCLUDE", "EXCLUDE"]).optional() };
const localDraftSchemas = {
    localControlScopeChanges: z.array(z.object({ ...sourcedChangeShape, controlId: z.string().uuid(), centralControlScopeId: optionalUuid, actualOwnerId: optionalUuid,
        frequencyCode: optionalDescriptionSchema, executionMethodCode: optionalDescriptionSchema, testMethodCode: optionalDescriptionSchema, localContextNote: optionalDescriptionSchema })).optional(),
    localRiskScopeChanges: z.array(z.object({ ...sourcedChangeShape, riskTemplateId: z.string().uuid(), centralRiskScopeId: optionalUuid })).optional(),
    localControlObjectiveScopeChanges: z.array(z.object({ ...sourcedChangeShape, controlObjectiveId: z.string().uuid(), centralControlObjectiveScopeId: optionalUuid })).optional(),
    localRequirementScopeChanges: z.array(z.object({ ...sourcedChangeShape, requirementId: z.string().uuid(), centralRequirementScopeId: optionalUuid })).optional(),
    localOrganizationPolicyChanges: z.array(z.object({ ...policyChangeShape, propagationMode: z.enum(["DIRECT_ONLY", "INCLUDE_DESCENDANTS"]).optional() })).optional(),
    localContextPolicyChanges: z.array(z.object({ ...policyChangeShape, contextRef: contextRefSchema })).optional(),
    localControlPolicyChanges: z.array(z.object({ ...policyChangeShape, controlScopeRef: controlScopeRefSchema })).optional(),
    localRequirementPolicyChanges: z.array(z.object({ ...policyChangeShape, requirementScopeRef: requirementScopeRefSchema })).optional(),
    organizationObjectiveChanges: z.array(z.object({ ...relationChangeShape, assignmentId: z.string().uuid().optional(), objectiveId: z.string().uuid(),
        name: optionalDescriptionSchema, description: optionalDescriptionSchema, owner: optionalDescriptionSchema })).optional(),
};

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
    organizationTypeId: z.string().trim().min(1),
    ownerAssignments: z.array(ownerChangeSchema).optional(),
    subprocesses: z.array(subprocessChangeSchema).optional(),
    ...localDraftSchemas,
    parentOrganizationId: z.string().trim().min(1).nullable().optional(),
    location: optionalLocationSchema,
    description: optionalDescriptionSchema,
    documents: documentAggregateRequestSchema,
});

export const organizationUpdateSchema = baseValiditySchema.extend({
    version: z.number().int().min(0),
    name: nameSchema,
    organizationType: organizationTypeSchema,
    organizationTypeId: z.string().trim().min(1),
    status: organizationEditableStatusSchema,
    ownerAssignments: z.array(ownerChangeSchema).optional(),
    subprocesses: z.array(subprocessChangeSchema).optional(),
    ...localDraftSchemas,
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
