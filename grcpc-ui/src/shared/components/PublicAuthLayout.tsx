import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, FlexBox, Grid, Title } from "@ui5/webcomponents-react";
import { applySettings, loadSettings, saveSettings } from "@/ui/ui-settings";
import "./public-auth-layout.css";

type PublicAuthLayoutProps = {
    panelLabel: string;
    children: ReactNode;
    compact?: boolean;
};

export default function PublicAuthLayout({ panelLabel, children, compact = false }: PublicAuthLayoutProps) {
    const { t, i18n } = useTranslation();
    const isFa = i18n.language.startsWith("fa");

    function toggleLanguage() {
        const nextLang = isFa ? "en" : "fa";
        const settings = { ...loadSettings(), lang: nextLang, dir: nextLang === "fa" ? "rtl" : "ltr" } as const;
        saveSettings(settings);
        applySettings(settings);
        void i18n.changeLanguage(nextLang);
    }

    return (
        <FlexBox className={`loginPage${compact ? " loginPage--compact" : ""}`} alignItems="Center" justifyContent="Center" dir={isFa ? "rtl" : "ltr"}>
            <Card className="loginCard">
                <Grid className="loginGrid" defaultSpan="XL7 L7 M12 S12" hSpacing="0" vSpacing="0">
                    <FlexBox className="loginVisual" alignItems="Stretch">
                        <img className="loginVisualImage" src="/images/digi-grc-reference-login-visual.jpg" alt={t("auth.login.hero.ariaLabel")} />
                    </FlexBox>
                    <FlexBox as="section" className="loginPanel" direction="Column" data-layout-span="XL5 L5 M12 S12" dir={isFa ? "rtl" : "ltr"} aria-label={panelLabel}>
                        <FlexBox justifyContent="End">
                            <Button design="Transparent" icon="world" onClick={toggleLanguage}>{t("auth.language.current")}</Button>
                        </FlexBox>
                        <FlexBox className="loginPanelContent" direction="Column" gap={compact ? "0.375rem" : "1rem"}>
                            <FlexBox direction="Column" alignItems="Center" gap={compact ? "0.25rem" : "0.75rem"}>
                                <img className="loginPanelBrand" src="/images/digi-grc-reference-login-logo.png" alt={t("brand.referenceLogoAlt")} />
                                <Title level="H2" wrappingType="Normal">{t("auth.login.hero.platform")}</Title>
                            </FlexBox>
                            {children}
                        </FlexBox>
                    </FlexBox>
                </Grid>
            </Card>
        </FlexBox>
    );
}
