import { httpClient } from "@/shared/infra/http.client";
import { configByKind } from "../config";
import type { CatalogConfig, CatalogItem, CatalogKind, CatalogMutationResponse, CreateCatalogBody, RevisionMutationResponse, UpdateCatalogBody } from "../domain/centralCatalog.model";

export const centralCatalogApi = {
    list(config: CatalogConfig | CatalogKind, deleted = false) { const resolved = typeof config === "string" ? configByKind(config) : config; return httpClient.get<CatalogItem[]>(`${resolved.baseUrl}${deleted ? "/deleted" : ""}`); },
    detail(config: CatalogConfig, id: string) { return httpClient.get<CatalogItem>(`${config.baseUrl}/${id}`); },
    create(config: CatalogConfig, body: CreateCatalogBody) { return httpClient.post<CatalogMutationResponse>(config.baseUrl, body); },
    update(config: CatalogConfig, id: string, body: UpdateCatalogBody) { return httpClient.patch<CatalogMutationResponse>(`${config.baseUrl}/${id}`, body); },
    move(config: CatalogConfig, id: string, body: Record<string, unknown>) { return httpClient.post<RevisionMutationResponse>(`${config.baseUrl}/${id}/move`, body); },
    lifecycle(config: CatalogConfig, id: string, action: "activate" | "inactivate" | "delete" | "restore", version: number) { return httpClient.post<RevisionMutationResponse>(`${config.baseUrl}/${id}/${action}`, { version }); },
};
