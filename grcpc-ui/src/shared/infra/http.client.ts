export class HttpError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly code?: string,
        public readonly data?: unknown,
    ) {
        super(message);
        this.name = "HttpError";
    }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request<T>(url: string, method: HttpMethod, body?: unknown): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
        let errorPayload: unknown = undefined;

        try {
            errorPayload = await response.json();
        } catch {
            // ignore parse error
        }

        const code =
            typeof errorPayload === "object" &&
            errorPayload !== null &&
            "code" in errorPayload &&
            typeof (errorPayload as { code?: unknown }).code === "string"
                ? (errorPayload as { code: string }).code
                : undefined;

        throw new HttpError(`HTTP ${response.status}`, response.status, code, errorPayload);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

export const httpClient = {
    get<T>(url: string) {
        return request<T>(url, "GET");
    },
    post<T>(url: string, body: unknown) {
        return request<T>(url, "POST", body);
    },
    put<T>(url: string, body: unknown) {
        return request<T>(url, "PUT", body);
    },
    patch<T>(url: string, body?: unknown) {
        return request<T>(url, "PATCH", body);
    },
    delete<T>(url: string) {
        return request<T>(url, "DELETE");
    },
};
