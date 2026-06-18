export type UnauthorizedRequestInfo = {
    method: string;
    status: number;
    url: string;
};

type UnauthorizedHandler = (
    request: UnauthorizedRequestInfo,
) => boolean | void | Promise<boolean | void>;

let handler: UnauthorizedHandler | null = null;
let handlingUnauthorized = false;

function getUrlPathname(url: string): string {
    try {
        return new URL(url, window.location.origin).pathname;
    } catch {
        return url.split("?")[0] ?? url;
    }
}

export function isUnauthorizedSessionCandidate(request: UnauthorizedRequestInfo): boolean {
    if (request.status !== 401) {
        return false;
    }

    const method = request.method.toUpperCase();
    const pathname = getUrlPathname(request.url).toLowerCase();

    if (method === "POST" && pathname.endsWith("/api/auth/login")) {
        return false;
    }

    if (method === "GET" && pathname.endsWith("/api/auth/me")) {
        return false;
    }

    return true;
}

export function registerUnauthorizedSessionHandler(nextHandler: UnauthorizedHandler): () => void {
    handler = nextHandler;

    return () => {
        if (handler === nextHandler) {
            handler = null;
        }
    };
}

export function resetUnauthorizedSessionHandling(): void {
    handlingUnauthorized = false;
}

export async function notifyUnauthorizedSession(
    request: UnauthorizedRequestInfo,
): Promise<boolean> {
    if (!isUnauthorizedSessionCandidate(request)) {
        return false;
    }

    if (handlingUnauthorized) {
        return true;
    }

    if (!handler) {
        return false;
    }

    handlingUnauthorized = true;

    try {
        const handled = await handler(request);

        if (handled === false) {
            handlingUnauthorized = false;
            return false;
        }

        return true;
    } catch {
        return true;
    }
}

