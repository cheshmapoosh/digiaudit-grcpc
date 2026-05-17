export type RepoSource = "api" | "storage";

function normalizeSource(raw: unknown): RepoSource | undefined {
    const value = String(raw ?? "").trim().toLowerCase();

    if (value === "api" || value === "storage") {
        return value;
    }

    return undefined;
}

export function resolveRepoSource(
    featureSource: unknown,
    fallback: RepoSource = "storage",
): RepoSource {
    return (
        normalizeSource(featureSource) ??
        normalizeSource(import.meta.env.VITE_GRCPC_DATA_SOURCE) ??
        fallback
    );
}
