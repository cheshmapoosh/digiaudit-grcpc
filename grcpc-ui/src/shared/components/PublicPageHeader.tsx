import { useTranslation } from "react-i18next";
import { Text, Title } from "@ui5/webcomponents-react";

import UiSettingsMenu from "@/layout/components/UiSettingsMenu";

type PublicPageHeaderProps = {
    titleKey: string;
    subtitleKey: string;
    titleDefault: string;
    subtitleDefault: string;
};

export default function PublicPageHeader({
                                             titleKey,
                                             subtitleKey,
                                             titleDefault,
                                             subtitleDefault,
                                         }: PublicPageHeaderProps) {
    const { t } = useTranslation();

    return (
        <div
            style={{
                width: "100%",
                border: "1px solid var(--sapList_BorderColor)",
                borderRadius: "1rem",
                background: "var(--sapGroup_ContentBackground)",
                boxShadow: "0 0.25rem 0.75rem rgba(0, 0, 0, 0.05)",
                padding: "0.875rem 1rem",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "1rem",
                    width: "100%",
                }}
            >
                <div
                    style={{
                        display: "grid",
                        gap: ".25rem",
                        minWidth: 0,
                        flex: 1,
                    }}
                >
                    <Title level="H3" style={{ margin: 0 }}>
                        {t(titleKey, { defaultValue: titleDefault })}
                    </Title>

                    <Text
                        style={{
                            color: "var(--sapContent_LabelColor)",
                            lineHeight: 1.6,
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                        }}
                    >
                        {t(subtitleKey, { defaultValue: subtitleDefault })}
                    </Text>
                </div>

                <div
                    style={{
                        flex: "0 0 auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <UiSettingsMenu trigger="button" />
                </div>
            </div>
        </div>
    );
}