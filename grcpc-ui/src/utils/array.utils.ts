export function isArrayOf<T = unknown>(value: unknown): value is T[] {
    return Array.isArray(value);
}

export function ensureArray<T>(value: unknown, fallback: T[] = []): T[] {
    return isArrayOf<T>(value) ? value : fallback;
}