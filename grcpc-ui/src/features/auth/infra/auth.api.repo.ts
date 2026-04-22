import { httpClient } from "@/shared/infra/http.client";
import type { AuthRepo } from "./auth.repo";
import type { AuthMeResponse, LoginRequest } from "@/features/auth";

const BASE_URL = "/api/auth";

export class AuthApiRepo implements AuthRepo {
    async me(): Promise<AuthMeResponse> {
        return httpClient.get<AuthMeResponse>(`${BASE_URL}/me`);
    }

    async login(payload: LoginRequest): Promise<void> {
        await httpClient.post<void>(`${BASE_URL}/login`, payload);
    }

    async logout(): Promise<void> {
        await httpClient.post<void>(`${BASE_URL}/logout`, {});
    }
}
