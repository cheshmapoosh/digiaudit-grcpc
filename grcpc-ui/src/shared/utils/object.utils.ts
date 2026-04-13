export function omitKeys<T extends Record<string, unknown>, K extends keyof T>(
    obj: T,
    keys: readonly K[],
): Omit<T, K> {
    const clone = { ...obj } as Record<string, unknown>;

    for (const key of keys) {
        delete clone[String(key)];
    }

    return clone as Omit<T, K>;
}

export function removeNil<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const result: Partial<T> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            result[key as keyof T] = value as T[keyof T];
        }
    }

    return result;
}
