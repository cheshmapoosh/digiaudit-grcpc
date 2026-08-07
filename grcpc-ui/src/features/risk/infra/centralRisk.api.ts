import { httpClient } from "@/shared/infra/http.client";
import type {
  CentralRiskCategoryDetail,
  CentralRiskCategorySummary,
  CentralRiskMutationResponse,
  CentralRiskRevisionResponse,
  CentralRiskTemplateDetail,
  CentralRiskTemplateSummary,
  CreateCentralRiskCategoryCommand,
  CreateCentralRiskTemplateCommand,
  MoveCentralRiskCategoryCommand,
  MoveCentralRiskTemplateCommand,
  UpdateCentralRiskCategoryCommand,
  UpdateCentralRiskTemplateCommand,
} from "../domain/centralRisk.model";
const CATEGORIES = "/api/master-data/central/risk-categories";
const TEMPLATES = "/api/master-data/central/risk-templates";
export const centralRiskApi = {
  listCategories: (deleted = false) =>
    httpClient.get<CentralRiskCategorySummary[]>(
      `${CATEGORIES}${deleted ? "/deleted" : ""}`,
    ),
  category: (id: string) =>
    httpClient.get<CentralRiskCategoryDetail>(`${CATEGORIES}/${id}`),
  createCategory: (body: CreateCentralRiskCategoryCommand) =>
    httpClient.post<CentralRiskMutationResponse>(CATEGORIES, body),
  updateCategory: (id: string, body: UpdateCentralRiskCategoryCommand) =>
    httpClient.patch<CentralRiskMutationResponse>(`${CATEGORIES}/${id}`, body),
  moveCategory: (id: string, body: MoveCentralRiskCategoryCommand) =>
    httpClient.post<CentralRiskRevisionResponse>(
      `${CATEGORIES}/${id}/move`,
      body,
    ),
  categoryLifecycle: (
    id: string,
    action: "activate" | "inactivate" | "delete" | "restore",
    version: number,
  ) =>
    httpClient.post<CentralRiskRevisionResponse>(
      `${CATEGORIES}/${id}/${action}`,
      { version },
    ),
  listTemplates: (categoryId: string, deleted = false) =>
    httpClient.get<CentralRiskTemplateSummary[]>(
      `${TEMPLATES}${deleted ? "/deleted" : `?categoryId=${encodeURIComponent(categoryId)}`}`,
    ),
  template: (id: string) =>
    httpClient.get<CentralRiskTemplateDetail>(`${TEMPLATES}/${id}`),
  createTemplate: (body: CreateCentralRiskTemplateCommand) =>
    httpClient.post<CentralRiskMutationResponse>(TEMPLATES, body),
  updateTemplate: (id: string, body: UpdateCentralRiskTemplateCommand) =>
    httpClient.patch<CentralRiskMutationResponse>(`${TEMPLATES}/${id}`, body),
  moveTemplate: (id: string, body: MoveCentralRiskTemplateCommand) =>
    httpClient.post<CentralRiskRevisionResponse>(
      `${TEMPLATES}/${id}/move`,
      body,
    ),
  templateLifecycle: (
    id: string,
    action: "activate" | "inactivate" | "delete" | "restore",
    version: number,
  ) =>
    httpClient.post<CentralRiskRevisionResponse>(
      `${TEMPLATES}/${id}/${action}`,
      { version },
    ),
};
