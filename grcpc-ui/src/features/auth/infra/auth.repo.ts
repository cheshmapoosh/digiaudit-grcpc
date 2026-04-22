import type { AuthMeResponse, LoginRequest } from "@/features/auth";

export interface AuthRepo {
    me(): Promise<AuthMeResponse>;
    login(payload: LoginRequest): Promise<void>;
    logout(): Promise<void>;
}
