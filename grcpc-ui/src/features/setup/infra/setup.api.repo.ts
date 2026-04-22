import { httpClient } from "@/shared/infra/http.client";
import type { InitializeSystemRequest, SetupStatus } from "@/features/setup";
import type { SetupRepo } from "./setup.repo";

const BASE_URL = "/api/setup";

export class SetupApiRepo implements SetupRepo {
    async getStatus(): Promise<SetupStatus> {
        return httpClient.get<SetupStatus>(`${BASE_URL}/status`);
    }

    async initialize(payload: InitializeSystemRequest): Promise<void> {
        await httpClient.post<void>(`${BASE_URL}/initialize`, payload);
    }
}
