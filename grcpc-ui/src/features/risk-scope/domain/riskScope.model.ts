import type {
  CentralRiskCategorySummary,
  CentralRiskTemplateSummary,
  CentralRiskType,
} from "@/features/risk/domain/centralRisk.model";

export type RiskScopeStatus = "ACTIVE" | "INACTIVE";
export type RiskScopeStatusFilter = RiskScopeStatus | "ALL";
export type RiskScopeEditState = "FINAL" | "DRAFT_NEW" | "DRAFT_EDITED" | "DRAFT_PENDING_DELETE";

export interface CentralSubprocessRiskScope {
  id: string;
  subprocessId: string;
  subprocessCode: string;
  subprocessTitle: string;
  riskTemplateId: string;
  riskTemplateCode: string;
  riskTemplateTitle: string;
  riskCategoryId: string;
  riskType: CentralRiskType;
  status: RiskScopeStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface RiskScopeSelectionOptions {
  riskTemplates: CentralRiskTemplateSummary[];
  riskCategories: CentralRiskCategorySummary[];
}

export interface RiskScopeDraftValues {
  validFrom: string | null;
  validTo: string | null;
}

export interface RiskScopeDraftRow extends RiskScopeDraftValues {
  key: string;
  scopeId: string | null;
  riskTemplateId: string;
  riskTemplateCode: string;
  riskTemplateTitle: string;
  riskCategoryId: string;
  riskType: CentralRiskType;
  status: RiskScopeStatus;
  version: number | null;
  editState: RiskScopeEditState;
  original: CentralSubprocessRiskScope | null;
}

export type RiskScopeChangeOperation = "CREATE_OR_RESTORE" | "UPDATE" | "ACTIVATE" | "INACTIVATE" | "DELETE";

export interface RiskScopeChange {
  operation: RiskScopeChangeOperation;
  riskTemplateId: string;
  scopeId?: string | null;
  version?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  requestedStatus?: RiskScopeStatus | null;
}

export interface RiskScopeDraftState {
  changes: RiskScopeChange[];
  dirty: boolean;
  ready: boolean;
  invalid: boolean;
}

export const EMPTY_RISK_SCOPE_DRAFT_STATE: RiskScopeDraftState = {
  changes: [],
  dirty: false,
  ready: true,
  invalid: false,
};

export interface RiskScopePermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  lifecycle: boolean;
  delete: boolean;
  restore: boolean;
  riskTemplateView: boolean;
}
