import i18n from "@/i18n/i18n";

export const t = (key: string, defaultValue: string) =>
    i18n.t(key, { defaultValue });