import { httpClient } from "@/shared/infra/http.client";

export type CatalogCounts = Partial<Record<string, number>>;

export const masterDataCatalogCountsApi = {
    get: (signal: AbortSignal) => httpClient.get<CatalogCounts>("/api/dashboard/master-data/catalog-counts", { signal }),
};
