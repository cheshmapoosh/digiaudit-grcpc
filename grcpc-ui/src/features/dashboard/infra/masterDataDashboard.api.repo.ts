import { httpClient } from "@/shared/infra/http.client";
import type { MasterDataDashboard } from "../domain/masterDataDashboard";

export const masterDataDashboardApi = {
  get: (signal?: AbortSignal) =>
    httpClient.get<MasterDataDashboard>("/api/dashboard/master-data", { signal }),
};
