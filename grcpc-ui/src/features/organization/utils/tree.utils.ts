export type ParentKey = string;

export const ROOT_PARENT_KEY = "__root__";

export function parentKey(parentId: string | null | undefined): ParentKey {
    return parentId ?? ROOT_PARENT_KEY;
}

export function isRootParent(parentId: string | null | undefined): boolean {
    return parentKey(parentId) === ROOT_PARENT_KEY;
}

export function normalizeText(value: string | null | undefined): string {
    return (value ?? "").trim().toLocaleLowerCase("fa");
}

export function containsText(
    source: string | null | undefined,
    search: string | null | undefined,
): boolean {
    const normalizedSearch = normalizeText(search);

    if (!normalizedSearch) {
        return true;
    }

    return normalizeText(source).includes(normalizedSearch);
}