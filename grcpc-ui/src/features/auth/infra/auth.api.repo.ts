import { httpClient } from "@/shared/infra/http.client";
import type { AuthRepo } from "./auth.repo";
import type { AuthMeResponse, LoginRequest } from "@/features/auth";

const BASE_URL = "/api/auth";

export class AuthApiRepo implements AuthRepo {
    async changeUsername(input: { currentPassword: string; newUsername: string }): Promise<void> {
        await httpClient.post<void>(BASE_URL + "/change-username", input);
    }

    async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
        await httpClient.post<void>(BASE_URL + "/change-password", input);
    }

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
