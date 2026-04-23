import { httpClient } from "@/shared/infra/http.client";

export type AuthMeResponse = {
    authenticated: boolean;
    userId: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    rootUser: boolean;
    authorities: string[];
};

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