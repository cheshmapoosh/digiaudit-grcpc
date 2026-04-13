// src/shared/api/apiClient.ts

import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    InternalAxiosRequestConfig,
    AxiosResponse,
} from "axios";

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

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

interface RefreshResponse {
    accessToken: string;
}

/* -------------------------------------------------------------------------- */
/*                              TOKEN MANAGEMENT                              */

/* -------------------------------------------------------------------------- */

function getAccessToken(): string | null {
    return localStorage.getItem("access_token");
}

function setAccessToken(token: string): void {
    localStorage.setItem("access_token", token);
}

function clearAuth(): void {
    localStorage.removeItem("access_token");
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
/*                            REQUEST INTERCEPTOR                             */
/* -------------------------------------------------------------------------- */

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

/* -------------------------------------------------------------------------- */
/*                           RESPONSE INTERCEPTOR                             */
/* -------------------------------------------------------------------------- */

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequestConfig | undefined;

        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry
        ) {
            originalRequest._retry = true;

            try {
                const refreshResponse = await axios.post<RefreshResponse>(
                    `${BASE_URL}/auth/refresh`,
                    {},
                    {withCredentials: true}
                );

                const newToken = refreshResponse.data.accessToken;

                setAccessToken(newToken);

                originalRequest.headers = {
                    ...originalRequest.headers,
                    Authorization: `Bearer ${newToken}`,
                };
                return apiClient(originalRequest as AxiosRequestConfig);
            } catch {
                clearAuth();
                window.location.href = "/login";
            }
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
