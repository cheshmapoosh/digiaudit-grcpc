import type { OrganizationTabKey } from "@/features/organization/pages/OrganizationObjectPage";
import type { MasterDataArea } from "@/features/master-data/security/masterDataAccess";
import type { LocalSectionKey } from "./local.model";

export interface LocalSectionSpec {
    key: LocalSectionKey;
    tab: OrganizationTabKey;
    labelKey: string;
    labelFa: string;
    areas: MasterDataArea[];
    identityFields: { name: string; labelKey: string; labelFa: string;
        options: string; local?: boolean }[];
    centralReferenceField?: string;
    centralReferenceOptions?: string;
    noteField?: string;
    policy?: boolean;
}

export const LOCAL_SECTIONS: LocalSectionSpec[] = [
    { key: "contexts", tab: "subprocesses", labelKey: "local.sections.contexts",
        labelFa: "زمینه‌های زیرفرآیند", areas: ["PROCESS"],
        identityFields: [{ name: "subprocessId", labelKey: "local.fields.subprocess",
            labelFa: "زیرفرآیند", options: "options/subprocesses" }], noteField: "contextNote" },
    { key: "risk-scopes", tab: "risks", labelKey: "local.sections.riskScopes",
        labelFa: "ریسک‌های محلی", areas: ["PROCESS", "RISK"],
        identityFields: [{ name: "riskTemplateId", labelKey: "local.fields.riskTemplate",
            labelFa: "الگوی ریسک", options: "options/risk-templates" }],
        centralReferenceField: "centralRiskScopeId", centralReferenceOptions: "risk-scopes" },
    { key: "risk-control-objective-coverages", tab: "risks",
        labelKey: "local.sections.riskObjectiveCoverages", labelFa: "پوشش ریسک و هدف کنترل",
        areas: ["PROCESS", "RISK", "CONTROL"],
        identityFields: [
            { name: "localRiskScopeId", labelKey: "local.fields.localRiskScope",
                labelFa: "ریسک محلی", options: "risk-scopes", local: true },
            { name: "localControlObjectiveScopeId", labelKey: "local.fields.localObjectiveScope",
                labelFa: "هدف کنترل محلی", options: "control-objective-scopes", local: true },
        ], centralReferenceField: "centralRiskControlObjectiveCoverageId",
        centralReferenceOptions: "risk-control-objective-coverages", noteField: "coverageNote" },
    { key: "control-scopes", tab: "controls", labelKey: "local.sections.controlScopes",
        labelFa: "کنترل‌های محلی", areas: ["PROCESS", "CONTROL"],
        identityFields: [{ name: "controlId", labelKey: "local.fields.control",
            labelFa: "کنترل", options: "options/controls" }],
        centralReferenceField: "centralControlScopeId", centralReferenceOptions: "control-scopes",
        noteField: "localContextNote" },
    { key: "risk-control-coverages", tab: "controls",
        labelKey: "local.sections.riskControlCoverages", labelFa: "پوشش ریسک و کنترل",
        areas: ["PROCESS", "RISK", "CONTROL"],
        identityFields: [
            { name: "localRiskScopeId", labelKey: "local.fields.localRiskScope",
                labelFa: "ریسک محلی", options: "risk-scopes", local: true },
            { name: "localControlScopeId", labelKey: "local.fields.localControlScope",
                labelFa: "کنترل محلی", options: "control-scopes", local: true },
        ], centralReferenceField: "centralRiskControlCoverageId",
        centralReferenceOptions: "risk-control-coverages", noteField: "coverageNote" },
    { key: "control-control-objective-coverages", tab: "controls",
        labelKey: "local.sections.controlObjectiveCoverages", labelFa: "پوشش کنترل و هدف کنترل",
        areas: ["PROCESS", "CONTROL"],
        identityFields: [
            { name: "localControlScopeId", labelKey: "local.fields.localControlScope",
                labelFa: "کنترل محلی", options: "control-scopes", local: true },
            { name: "localControlObjectiveScopeId", labelKey: "local.fields.localObjectiveScope",
                labelFa: "هدف کنترل محلی", options: "control-objective-scopes", local: true },
        ], centralReferenceField: "centralControlControlObjectiveCoverageId",
        centralReferenceOptions: "control-control-objective-coverages", noteField: "coverageNote" },
    { key: "requirement-control-coverages", tab: "controls",
        labelKey: "local.sections.requirementControlCoverages", labelFa: "پوشش الزام و کنترل",
        areas: ["PROCESS", "GOVERNANCE", "CONTROL"],
        identityFields: [
            { name: "localRequirementScopeId", labelKey: "local.fields.localRequirementScope",
                labelFa: "الزام محلی", options: "requirement-scopes", local: true },
            { name: "localControlScopeId", labelKey: "local.fields.localControlScope",
                labelFa: "کنترل محلی", options: "control-scopes", local: true },
        ], centralReferenceField: "centralRequirementControlCoverageId",
        centralReferenceOptions: "requirement-control-coverages", noteField: "coverageNote" },
    { key: "requirement-scopes", tab: "regulations",
        labelKey: "local.sections.requirementScopes", labelFa: "الزامات محلی",
        areas: ["PROCESS", "GOVERNANCE"],
        identityFields: [{ name: "requirementId", labelKey: "local.fields.requirement",
            labelFa: "الزام", options: "options/requirements" }],
        centralReferenceField: "centralRequirementScopeId",
        centralReferenceOptions: "requirement-scopes" },
    { key: "control-objective-scopes", tab: "objectives",
        labelKey: "local.sections.objectiveScopes", labelFa: "اهداف کنترل محلی",
        areas: ["PROCESS", "CONTROL"],
        identityFields: [{ name: "controlObjectiveId", labelKey: "local.fields.objective",
            labelFa: "هدف کنترل", options: "options/control-objectives" }],
        centralReferenceField: "centralControlObjectiveScopeId",
        centralReferenceOptions: "control-objective-scopes" },
    { key: "organization-policies", tab: "policies",
        labelKey: "local.sections.organizationPolicies", labelFa: "تصمیم سیاست برای سازمان",
        areas: ["GOVERNANCE"],
        identityFields: [{ name: "policyId", labelKey: "local.fields.policy",
            labelFa: "سیاست", options: "options/policies" }], policy: true },
    { key: "context-policies", tab: "policies",
        labelKey: "local.sections.contextPolicies", labelFa: "تصمیم سیاست برای زمینه",
        areas: ["PROCESS", "GOVERNANCE"],
        identityFields: [{ name: "policyId", labelKey: "local.fields.policy",
            labelFa: "سیاست", options: "options/policies" }], policy: true },
    { key: "control-policies", tab: "policies",
        labelKey: "local.sections.controlPolicies", labelFa: "تصمیم سیاست برای کنترل محلی",
        areas: ["PROCESS", "CONTROL", "GOVERNANCE"],
        identityFields: [{ name: "policyId", labelKey: "local.fields.policy",
            labelFa: "سیاست", options: "options/policies" }], policy: true },
    { key: "requirement-policies", tab: "policies",
        labelKey: "local.sections.requirementPolicies", labelFa: "تصمیم سیاست برای الزام محلی",
        areas: ["PROCESS", "GOVERNANCE"],
        identityFields: [{ name: "policyId", labelKey: "local.fields.policy",
            labelFa: "سیاست", options: "options/policies" }], policy: true },
];

export const LOCAL_SECTION_BY_KEY = Object.fromEntries(
    LOCAL_SECTIONS.map((section) => [section.key, section]),
) as Record<LocalSectionKey, LocalSectionSpec>;
