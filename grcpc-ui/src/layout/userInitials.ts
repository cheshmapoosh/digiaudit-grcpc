export function userInitials(fullName: string): string {
    return fullName.trim().split(/\s+/).slice(0, 2)
        .map((part) => Array.from(part)[0] ?? "").join("").toUpperCase();
}
