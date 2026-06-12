import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const controlStatusSchema = z.enum(["active", "inactive"]);

export const controlAssignmentStatusSchema = z.enum(["active", "inactive"]);

export const controlStructureNodeTypeSchema = z.enum(["process", "subProcess", "control"]);

export const controlNatureSchema = z.enum(["preventive", "detective"]);

export const controlAutomationTypeSchema = z.enum(["manual", "system", "semiManualSystem"]);

export const controlImportanceSchema = z.enum(["low", "medium", "high", "critical"]);

const optionalTextSchema = (maxLength: number) =>
    z
        .string()
        .trim()
        .max(maxLength, t("control.validation.textMaxLength", "Text is too long"))
        .nullable()
        .optional();

const optionalDateSchema = z.string().trim().nullable().optional();

const optionalUuidSchema = z.string().trim().min(1).nullable().optional();

const optionalSortOrderSchema = z.number().int().min(0).nullable().optional();

export const createControlAndAssignSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, t("control.validation.codeRequired", "Code is required"))
        .max(50, t("control.validation.codeMaxLength", "Code cannot be longer than 50 characters")),
    name: z
        .string()
        .trim()
        .min(1, t("control.validation.nameRequired", "Name is required"))
        .max(255, t("control.validation.nameMaxLength", "Name cannot be longer than 255 characters")),
    description: optionalTextSchema(2000),
    controlClass: optionalTextSchema(255),
    controlNature: controlNatureSchema.nullable().optional(),
    automationType: controlAutomationTypeSchema.nullable().optional(),
    importance: controlImportanceSchema.nullable().optional(),
    objective: optionalTextSchema(2000),
    ownerId: optionalUuidSchema,
    ownerName: optionalTextSchema(255),
    validFrom: optionalDateSchema,
    validTo: optionalDateSchema,
    sortOrder: optionalSortOrderSchema,
    operationPeriod: optionalTextSchema(255),
    testMethod: optionalTextSchema(255),
    testPlan: optionalTextSchema(2000),
});

export const attachExistingControlSchema = z.object({
    controlId: z.string().trim().min(1, t("control.validation.controlRequired", "Control is required")),
    ownerId: optionalUuidSchema,
    ownerName: optionalTextSchema(255),
    validFrom: optionalDateSchema,
    validTo: optionalDateSchema,
    sortOrder: optionalSortOrderSchema,
    operationPeriod: optionalTextSchema(255),
    testMethod: optionalTextSchema(255),
    testPlan: optionalTextSchema(2000),
});

export const updateControlAssignmentSchema = z.object({
    ownerId: optionalUuidSchema,
    ownerName: optionalTextSchema(255),
    validFrom: optionalDateSchema,
    validTo: optionalDateSchema,
    sortOrder: optionalSortOrderSchema,
    operationPeriod: optionalTextSchema(255),
    testMethod: optionalTextSchema(255),
    testPlan: optionalTextSchema(2000),
    assignmentStatus: controlAssignmentStatusSchema,
});

export type CreateControlAndAssignInput = z.infer<typeof createControlAndAssignSchema>;
export type AttachExistingControlInput = z.infer<typeof attachExistingControlSchema>;
export type UpdateControlAssignmentInput = z.infer<typeof updateControlAssignmentSchema>;
