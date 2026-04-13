export function isArrayOf<T = unknown>(value: unknown): value is T[] {
    return Array.isArray(value);
}

export function ensureArray<T>(value: unknown, fallback: T[] = []): T[] {
    return isArrayOf<T>(value) ? value : fallback;
}

export function omitKeys<T extends Record<string, unknown>, K extends keyof T>(
    input: T,
    keys: readonly K[],
): Omit<T, K> {
    const clone = { ...input };

    for (const key of keys) {
        delete clone[key];
    }

    return clone;
}