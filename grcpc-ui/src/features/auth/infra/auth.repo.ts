import type { AuthMeResponse, LoginRequest } from "@/features/auth";

export interface AuthRepo {
    changeUsername(input: { currentPassword: string; newUsername: string }): Promise<void>;
    changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>;
    me(): Promise<AuthMeResponse>;
    login(payload: LoginRequest): Promise<void>;
    logout(): Promise<void>;
}
