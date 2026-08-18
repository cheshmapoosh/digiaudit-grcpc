import I18nBundle, {
    registerCustomI18nBundleGetter,
    type I18nText,
} from "@ui5/webcomponents-base/dist/i18nBundle.js";

import i18n from "@/i18n/i18n";

function textKey(text: I18nText | string): string {
    return typeof text === "string" ? text : text.key;
}

function defaultText(text: I18nText | string): string {
    return typeof text === "string" ? text : text.defaultText || text.key;
}

function formatDefault(value: string, params: Array<number | string>): string {
    return value.replace(/\{(\d+)\}/g, (match, index) => {
        const parameter = params[Number(index)];
        return parameter === undefined ? match : String(parameter);
    });
}

function isPersian(): boolean {
    return (i18n.resolvedLanguage ?? i18n.language ?? "fa").toLowerCase().startsWith("fa");
}

function localizedNumber(value: number | string | undefined): string {
    if (value === undefined) return "";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return new Intl.NumberFormat(isPersian() ? "fa-IR" : "en-US", { useGrouping: false }).format(numeric);
}

function numericParam(value: number | string | undefined): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function localizeDigits(value: string): string {
    if (!isPersian()) return value;
    return value.replace(/\d+/g, (digits) => localizedNumber(Number(digits)));
}

function translatedUi5Text(key: string, params: Array<number | string>): string | null {
    if (!isPersian()) return null;

    switch (key) {
        case "MCB_SELECTED_ITEMS":
            return i18n.t("ui5.multiComboBox.selectAll", {
                selected: localizedNumber(params[0]),
                total: localizedNumber(params[1]),
            });
        case "TOKENIZER_SHOW_ALL_ITEMS":
            return localizeDigits(
                i18n.t("ui5.multiComboBox.items", { count: numericParam(params[0]) }),
            );
        case "MULTIINPUT_SHOW_MORE_TOKENS":
            return localizeDigits(
                i18n.t("ui5.multiComboBox.moreItems", { count: numericParam(params[0]) }),
            );
        case "TOKENIZER_CLEAR_ALL":
            return i18n.t("ui5.multiComboBox.clearAll");
        case "UPLOADCOLLECTIONITEM_CANCELBUTTON_TEXT":
            return i18n.t("ui5.uploadCollection.cancel");
        case "UPLOADCOLLECTIONITEM_RENAMEBUTTON_TEXT":
            return i18n.t("ui5.uploadCollection.rename");
        case "UPLOADCOLLECTIONITEM_ERROR_STATE":
            return i18n.t("ui5.uploadCollection.error");
        case "UPLOADCOLLECTIONITEM_READY_STATE":
            return i18n.t("ui5.uploadCollection.ready");
        case "UPLOADCOLLECTIONITEM_UPLOADING_STATE":
            return i18n.t("ui5.uploadCollection.uploading");
        case "UPLOADCOLLECTIONITEM_TERMINATE_BUTTON_TEXT":
            return i18n.t("ui5.uploadCollection.terminate");
        case "UPLOADCOLLECTIONITEM_RETRY_BUTTON_TEXT":
            return i18n.t("ui5.uploadCollection.retry");
        case "UPLOADCOLLECTIONITEM_EDIT_BUTTON_TEXT":
            return i18n.t("ui5.uploadCollection.edit");
        case "UPLOADCOLLECTION_NO_DATA_TEXT":
            return i18n.t("ui5.uploadCollection.noData");
        case "UPLOADCOLLECTION_NO_DATA_DESCRIPTION":
            return i18n.t("ui5.uploadCollection.noDataDescription");
        case "UPLOADCOLLECTION_ARIA_ROLE_DESCRIPTION":
            return i18n.t("ui5.uploadCollection.ariaRole");
        case "UPLOADCOLLECTION_DRAG_FILE_INDICATOR":
            return i18n.t("ui5.uploadCollection.dragHere");
        case "UPLOADCOLLECTION_DROP_FILE_INDICATOR":
            return i18n.t("ui5.uploadCollection.dropHere");
        default:
            return null;
    }
}

class AppI18nBundle extends I18nBundle {
    override getText(text: I18nText | string, ...params: Array<number | string>): string {
        const translated = translatedUi5Text(textKey(text), params);
        return translated ?? formatDefault(defaultText(text), params);
    }
}

let registered = false;

export function registerUi5I18nBridge(): void {
    if (registered) return;
    registered = true;
    registerCustomI18nBundleGetter(async (packageName) => new AppI18nBundle(packageName));
}
