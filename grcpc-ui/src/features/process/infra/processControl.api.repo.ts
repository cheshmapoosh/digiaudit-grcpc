import { httpClient } from "@/shared/infra/http.client";
import type { ProcessControlNode } from "../domain/processControl.model";

export const processControlApi = {
  list: (signal?: AbortSignal) => httpClient.get<ProcessControlNode[]>(
    "/api/master-data/central/control-scope/process-tree", { signal }),
};
