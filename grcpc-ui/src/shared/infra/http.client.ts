export class HttpError extends Error {
    public readonly status: number;
    public readonly code?: string;
    public readonly data?: unknown;

    constructor(
        message: string,
        status: number,
        code?: string,
        data?: unknown,
    ) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.code = code;
        this.data = data;
    }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
};

const API_BASE_URL = (import.meta.env.VITE_GRCPC_API_BASE_URL ?? "").trim();

function isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

function buildUrl(path: string): string {
    if (isAbsoluteUrl(path)) {
        return path;
    }

    const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}

function isJsonContentType(contentType: string | null): boolean {
    return !!contentType && contentType.toLowerCase().includes("application/json");
}

async function parseResponseBody(response: Response): Promise<unknown> {
    if (response.status === 204) {
        return undefined;
    }

    const contentType = response.headers.get("Content-Type");

    if (isJsonContentType(contentType)) {
        return response.json();
    }

    const text = await response.text();
    return text.length > 0 ? text : undefined;
}

function extractErrorCode(payload: unknown): string | undefined {
    if (
        typeof payload === "object" &&
        payload !== null &&
        "code" in payload &&
        typeof (payload as { code?: unknown }).code === "string"
    ) {
        return (payload as { code: string }).code;
    }

    return undefined;
}

function extractErrorMessage(status: number, payload: unknown): string {
    if (
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof (payload as { message?: unknown }).message === "string"
    ) {
        return (payload as { message: string }).message;
    }

    if (typeof payload === "string" && payload.trim().length > 0) {
        return payload;
    }

    return `HTTP ${status}`;
}

async function request<T>(
    url: string,
    method: HttpMethod,
    options: RequestOptions = {},
): Promise<T> {
    const finalUrl = buildUrl(url);
    const hasBody = options.body !== undefined;

    const response = await fetch(finalUrl, {
        method,
        headers: {
            Accept: "application/json",
            ...(hasBody ? { "Content-Type": "application/json" } : {}),
            ...options.headers,
        },
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
        // اگر بعدا احراز هویت cookie-based شد، این را فعال کن:
        // credentials: "include",
    });

    const payload = await parseResponseBody(response);

    if (!response.ok) {
        throw new HttpError(
            extractErrorMessage(response.status, payload),
            response.status,
            extractErrorCode(payload),
            payload,
        );
    }

    return payload as T;
}

export const httpClient = {
    get<T>(url: string, options?: Omit<RequestOptions, "body">) {
        return request<T>(url, "GET", options);
    },

    post<T>(url: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
        return request<T>(url, "POST", { ...options, body });
    },

    put<T>(url: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
        return request<T>(url, "PUT", { ...options, body });
    },

    patch<T>(url: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
        return request<T>(url, "PATCH", { ...options, body });
    },

    delete<T>(url: string, options?: Omit<RequestOptions, "body">) {
        return request<T>(url, "DELETE", options);
    },
};