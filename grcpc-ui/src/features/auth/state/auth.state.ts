import { create } from "zustand";

import { authService, type AuthMeResponse } from "@/features/auth/service/auth.service";

export interface AuthState {
    me: AuthMeResponse | null;
    loading: boolean;
    submitting: boolean;
    error: string | null;
    mePromise: Promise<AuthMeResponse> | null;

    loadMe: () => Promise<AuthMeResponse>;
    login: (payload: { username: string; password: string }) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    reset: () => void;
}

function toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return fallback;
}

const anonymousUser: AuthMeResponse = {
    authenticated: false,
    userId: null,
    username: null,
    firstName: null,
    lastName: null,
    rootUser: false,
    authorities: [],
};

export const useAuthState = create<AuthState>((set, get) => ({
    me: null,
    loading: false,
    submitting: false,
    error: null,
    mePromise: null,

    loadMe: async () => {
        const { me, mePromise } = get();

        if (me !== null) {
            return me;
        }

        if (mePromise) {
            return mePromise;
        }

        const request = (async () => {
            set({ loading: true, error: null });

            try {
                const meResponse = await authService.me();
                set({ me: meResponse });
                return meResponse;
            } catch (error) {
                set({
                    me: anonymousUser,
                    error: toErrorMessage(error, "خطا در دریافت وضعیت کاربر"),
                });
                return anonymousUser;
            } finally {
                set({ loading: false, mePromise: null });
            }
        })();

        set({ mePromise: request });

        return request;
    },

    login: async (payload) => {
        set({ submitting: true, error: null });

        try {
            await authService.login(payload);
            const meResponse = await authService.me();
            set({ me: meResponse });
        } catch (error) {
            set({
                error: toErrorMessage(error, "ورود به سامانه انجام نشد"),
            });
            throw error;
        } finally {
            set({ submitting: false });
        }
    },

    logout: async () => {
        set({ submitting: true, error: null });

        try {
            await authService.logout();
            set({
                me: anonymousUser,
                mePromise: null,
            });
        } catch (error) {
            set({
                error: toErrorMessage(error, "خروج از سامانه انجام نشد"),
            });
            throw error;
        } finally {
            set({ submitting: false });
        }
    },

    clearError: () => {
        set({ error: null });
    },

    reset: () => {
        set({
            me: null,
            loading: false,
            submitting: false,
            error: null,
            mePromise: null,
        });
    },
}));