import type { CatalogConfig, CatalogFamily } from "./domain/centralCatalog.model";

export const CATALOG_CONFIGS: CatalogConfig[] = [
    { kind: "controls", family: "control", titleKey: "centralCatalog.controls", title: "کنترل‌های مرکزی", baseUrl: "/api/master-data/central/controls", documentTarget: "CENTRAL_CONTROL", hasSortOrder: false, supportsMove: false },
    { kind: "controlObjectives", family: "control", titleKey: "centralCatalog.controlObjectives", title: "اهداف کنترلی مرکزی", baseUrl: "/api/master-data/central/control-objectives", documentTarget: "CENTRAL_CONTROL_OBJECTIVE_DEF", hasSortOrder: false, supportsMove: false },
    { kind: "riskCategories", family: "risk", titleKey: "centralCatalog.riskCategories", title: "دسته‌های ریسک", baseUrl: "/api/master-data/central/risk-categories", documentTarget: "CENTRAL_RISK_CATEGORY", parentField: "parentCategoryId", parentKind: "riskCategories", hasSortOrder: true, supportsMove: true },
    { kind: "riskTemplates", family: "risk", titleKey: "centralCatalog.riskTemplates", title: "الگوهای ریسک", baseUrl: "/api/master-data/central/risk-templates", documentTarget: "CENTRAL_RISK_TEMPLATE", parentField: "riskCategoryId", parentKind: "riskCategories", hasSortOrder: true, supportsMove: true },
    { kind: "accountGroups", family: "accountGroup", titleKey: "centralCatalog.accountGroups", title: "گروه‌های حساب", baseUrl: "/api/master-data/central/account-groups", documentTarget: "CENTRAL_ACCOUNT_GROUP", parentField: "parentAccountGroupId", parentKind: "accountGroups", hasSortOrder: true, supportsMove: true },
    { kind: "regulationGroups", family: "regulation", titleKey: "centralCatalog.regulationGroups", title: "گروه‌های مقررات", baseUrl: "/api/master-data/central/regulation-groups", documentTarget: "CENTRAL_REGULATION_GROUP", parentField: "parentGroupId", parentKind: "regulationGroups", hasSortOrder: true, supportsMove: true },
    { kind: "regulations", family: "regulation", titleKey: "centralCatalog.regulations", title: "مقررات", baseUrl: "/api/master-data/central/regulations", documentTarget: "CENTRAL_REGULATION", parentField: "regulationGroupId", parentKind: "regulationGroups", hasSortOrder: true, supportsMove: true },
    { kind: "regulationRequirements", family: "regulation", titleKey: "centralCatalog.regulationRequirements", title: "الزامات مقررات", baseUrl: "/api/master-data/central/regulation-requirements", documentTarget: "CENTRAL_REQUIREMENT", parentField: "regulationId", parentKind: "regulations", hasSortOrder: true, supportsMove: true },
    { kind: "policyGroups", family: "policy", titleKey: "centralCatalog.policyGroups", title: "گروه‌های خط‌مشی", baseUrl: "/api/master-data/central/policy-groups", documentTarget: "CENTRAL_POLICY_GROUP", parentField: "parentGroupId", parentKind: "policyGroups", hasSortOrder: true, supportsMove: true },
    { kind: "policies", family: "policy", titleKey: "centralCatalog.policies", title: "خط‌مشی‌ها", baseUrl: "/api/master-data/central/policies", documentTarget: "CENTRAL_POLICY", parentField: "policyGroupId", parentKind: "policyGroups", hasSortOrder: true, supportsMove: true },
];

export const familyConfigs = (family: CatalogFamily) => CATALOG_CONFIGS.filter((config) => config.family === family);
export const configByKind = (kind: CatalogConfig["kind"]) => CATALOG_CONFIGS.find((config) => config.kind === kind)!;
