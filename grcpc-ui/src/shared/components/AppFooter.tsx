import { Text } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";

export function AppFooter() {
    const { t } = useTranslation();

    const currentYear = new Date().getFullYear();

    return (
        <footer
            style={{
                position: "fixed",
                insetInlineStart: 0,
                insetInlineEnd: 0,
                insetBlockEnd: 0,
                height: "2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingInline: "1rem",
                background: "var(--sapPageFooter_Background, var(--sapPageHeader_Background))",
                borderBlockStart: "1px solid var(--sapList_BorderColor)",
                zIndex: 20,
            }}
        >
            <Text
                style={{
                    fontSize: "0.75rem",
                    color: "var(--sapContent_LabelColor)",
                    whiteSpace: "nowrap",
                }}
                title={__BUILD_TIME__}
            >
                {t("app.footer.copyright", {
                    year: currentYear,
                    company: t("app.companyName"),
                    product: t("app.productName"),
                    version: __APP_VERSION__,
                })}
            </Text>
        </footer>
    );
}