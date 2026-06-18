// src/shared/api/apiClient.ts

import axios from "axios";
import type {
    AxiosError,
    AxiosInstance,
    AxiosResponse,
} from "axios";
import { notifyUnauthorizedSession } from "@/shared/infra/unauthorizedSession";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */

/* -------------------------------------------------------------------------- */

export interface ApiError {
    status: number;
    message: string;
    details?: unknown;
}

interface ApiErrorResponse {
    message?: string;
    details?: unknown;
}

/* -------------------------------------------------------------------------- */
/*                               AXIOS INSTANCE                               */
/* -------------------------------------------------------------------------- */

export const apiClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

/* -------------------------------------------------------------------------- */
/*                           RESPONSE INTERCEPTOR                             */
/* -------------------------------------------------------------------------- */

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401 && error.config) {
            const requestUrl = /^https?:\/\//i.test(error.config.url ?? "")
                ? error.config.url ?? ""
                : `${BASE_URL}${error.config.url ?? ""}`;

            await notifyUnauthorizedSession({
                method: error.config.method ?? "GET",
                status: error.response.status,
                url: requestUrl,
            });
        }

        return Promise.reject(normalizeError(error));
    }
);

/* -------------------------------------------------------------------------- */
/*                              ERROR NORMALIZER                              */

/* -------------------------------------------------------------------------- */

function normalizeError(error: AxiosError): ApiError {
    const status = error.response?.status ?? 500;

    const data = error.response?.data as ApiErrorResponse | undefined;

    const message = data?.message ?? error.message ?? "Unexpected error";

    return {
        status,
        message,
        details: data?.details,
    };
}
