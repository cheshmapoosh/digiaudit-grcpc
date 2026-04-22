import { httpClient } from "@/shared/infra/http.client";

import type { AuthMeResponse } from "../state/auth.state";

export const authService = {
    login(payload: { username: string; password: string }) {
        return httpClient.post<void>("/api/auth/login", payload);
    },

    me() {
        return httpClient.get<AuthMeResponse>("/api/auth/me");
    },

    logout() {
        return httpClient.post<void>("/api/auth/logout");
    },
};