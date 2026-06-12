import type { ReactNode } from "react";

import { formatPersianDate, toEnglishDigits } from "@/shared/utils/date.utils";

export interface ControlTableColumn<T> {
    key: string;
    label: string;
    render: (item: T) => ReactNode;
    width?: string;
}

export function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

export function readDatePickerValue(event: unknown): string {
    const detailValue = (event as { detail?: { value?: string } }).detail?.value;
    return toEnglishDigits(detailValue ?? readInputValue(event));
}

export function readSelectedDataValue(event: unknown, fallback = ""): string {
    const selectedOption = (event as {
        detail?: {
            selectedOption?: {
                getAttribute?: (name: string) => string | null;
            };
        };
    }).detail?.selectedOption;

    return selectedOption?.getAttribute?.("data-value") ?? fallback;
}

export function normalizeOptionalText(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

export function parseNonNegativeInteger(value: string): number | undefined {
    if (!value.trim()) {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function displayText(value?: string | number | null): string {
    if (typeof value === "number") {
        return String(value);
    }

    return value?.trim() ? value : "-";
}

export function displayDate(value?: string | null): string {
    return value ? formatPersianDate(value) : "-";
}

export function mapControlTabError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}
