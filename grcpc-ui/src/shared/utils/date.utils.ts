const PERSIAN_DATE_LOCALE = "fa-IR-u-ca-persian-nu-arabext";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function isNonEmpty(value: string | null | undefined): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function normalizeDateText(value: string): string {
    return toEnglishDigits(value).trim();
}

function isLikelyPersianCalendarText(value: string): boolean {
    return /^(13|14)\d{2}[/\-.]\d{1,2}[/\-.]\d{1,2}(?:[ T]\d{1,2}:\d{1,2}(?::\d{1,2})?)?$/.test(
        value,
    );
}

function hasTimePart(value: string): boolean {
    return /[T ]\d{1,2}:\d{1,2}/.test(value);
}

function toDate(value: string): Date | null {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function normalizePersianCalendarText(value: string): string {
    const normalized = normalizeDateText(value).replace(/[.-]/g, "/");
    return toPersianDigits(normalized);
}

export function toPersianDigits(value: string): string {
    return value.replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

export function toEnglishDigits(value: string): string {
    return value
        .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

export function formatPersianDate(value?: string | null): string {
    if (!isNonEmpty(value)) {
        return "-";
    }

    const normalized = normalizeDateText(value);

    if (isLikelyPersianCalendarText(normalized)) {
        return normalizePersianCalendarText(normalized);
    }

    const parsed = toDate(normalized);

    if (!parsed) {
        return toPersianDigits(value.trim());
    }

    return new Intl.DateTimeFormat(PERSIAN_DATE_LOCALE, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(parsed);
}

export function formatPersianDateTime(value?: string | null): string {
    if (!isNonEmpty(value)) {
        return "-";
    }

    const normalized = normalizeDateText(value);

    if (isLikelyPersianCalendarText(normalized)) {
        return normalizePersianCalendarText(normalized);
    }

    const parsed = toDate(normalized);

    if (!parsed) {
        return toPersianDigits(value.trim());
    }

    return new Intl.DateTimeFormat(PERSIAN_DATE_LOCALE, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        ...(hasTimePart(normalized)
            ? {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
              }
            : {}),
    }).format(parsed);
}
