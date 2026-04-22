import { create } from "zustand";

import type { InitializeSystemRequest, SetupStatus } from "@/features/setup";
import { setupService } from "@/features/setup";

export interface SetupState {
    status: SetupStatus | null;
    loading: boolean;
    submitting: boolean;
    error: string | null;
    statusPromise: Promise<SetupStatus> | null;

    loadStatus: () => Promise<SetupStatus>;
    initialize: (payload: InitializeSystemRequest) => Promise<void>;
    reset: () => void;
    clearError: () => void;
}

function toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return fallback;
}

export const useSetupState = create<SetupState>((set, get) => ({
    status: null,
    loading: false,
    submitting: false,
    error: null,
    statusPromise: null,

    loadStatus: async () => {
        const { status, statusPromise } = get();

        if (status !== null) {
            return status;
        }

        if (statusPromise) {
            return statusPromise;
        }

        const request = (async () => {
            set({ loading: true, error: null });

            try {
                const result = await setupService.getStatus();
                set({ status: result });
                return result;
            } catch (error) {
                set({
                    error: toErrorMessage(error, "خطا در دریافت وضعیت راه‌اندازی"),
                });
                throw error;
            } finally {
                set({ loading: false, statusPromise: null });
            }
        })();

        set({ statusPromise: request });

        return request;
    },

    initialize: async (payload) => {
        set({ submitting: true, error: null });

        try {
            await setupService.initialize(payload);
            set({
                status: { initialized: true },
            });
        } catch (error) {
            set({
                error: toErrorMessage(error, "خطا در راه‌اندازی سامانه"),
            });
            throw error;
        } finally {
            set({ submitting: false });
        }
    },

    reset: () => {
        set({
            status: null,
            loading: false,
            submitting: false,
            error: null,
            statusPromise: null,
        });
    },

    clearError: () => {
        set({ error: null });
    },
}));