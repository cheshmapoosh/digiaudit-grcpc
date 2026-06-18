const DEFAULT_RETURN_URL = "/dashboard";

export type InternalRouteLocation = {
    pathname?: string;
    search?: string;
    hash?: string;
};

export type LoginRouterState = {
    from?: InternalRouteLocation;
    sessionExpired?: boolean;
};

function getBaseOrigin(): string {
    return typeof window === "undefined" ? "http://localhost" : window.location.origin;
}

export function sanitizeInternalReturnUrl(value: string | null | undefined): string | null {
    const trimmed = value?.trim();

    if (!trimmed || trimmed.includes("\\") || trimmed.startsWith("//")) {
        return null;
    }

    try {
        const url = new URL(trimmed, getBaseOrigin());

        if (url.origin !== getBaseOrigin()) {
            return null;
        }

        if (!url.pathname.startsWith("/") || url.pathname === "/" || url.pathname === "/login") {
            return null;
        }

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return null;
    }
}

export function buildReturnUrlFromLocation(
    location: InternalRouteLocation | null | undefined,
): string | null {
    if (!location?.pathname) {
        return null;
    }

    return sanitizeInternalReturnUrl(
        `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`,
    );
}

export function parseReturnUrlToLocation(returnUrl: string | null): InternalRouteLocation | undefined {
    const safeReturnUrl = sanitizeInternalReturnUrl(returnUrl);

    if (!safeReturnUrl) {
        return undefined;
    }

    const url = new URL(safeReturnUrl, getBaseOrigin());

    return {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
    };
}

export function resolveLoginReturnUrl(
    search: string,
    state: LoginRouterState | null,
): string {
    const params = new URLSearchParams(search);

    return (
        buildReturnUrlFromLocation(state?.from) ??
        sanitizeInternalReturnUrl(params.get("returnTo")) ??
        DEFAULT_RETURN_URL
    );
}

