export type ParentKey = string | "__root__";

export function parentKey(parentId: string | null): ParentKey {
    return parentId ?? "__root__";
}
