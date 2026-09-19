import type { AuthMeResponse, LoginRequest } from "@/features/auth";

export interface AuthRepo {
    changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>;
    me(): Promise<AuthMeResponse>;
    login(payload: LoginRequest): Promise<void>;
    logout(): Promise<void>;
}
