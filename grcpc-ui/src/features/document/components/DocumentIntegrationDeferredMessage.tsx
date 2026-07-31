import { MessageStrip, Text, Title } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";

interface DocumentIntegrationDeferredMessageProps {
    title?: string;
}

const WRAPPER_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.75rem",
    minHeight: "10rem",
    minWidth: 0,
    background: "var(--sapGroup_ContentBackground)",
    border: "1px solid var(--sapList_BorderColor)",
    padding: "1rem",
};

export default function DocumentIntegrationDeferredMessage({
    title,
}: DocumentIntegrationDeferredMessageProps) {
    const { t } = useTranslation();

    return (
        <div style={WRAPPER_STYLE}>
            <Title level="H5">
                {title ?? t("document.title", { defaultValue: "Documents" })}
            </Title>
            <MessageStrip design="Information" hideCloseButton>
                <Text>
                    {t("document.integrationDeferred.message", {
                        defaultValue:
                            "Document integration for this feature is deferred until its Master Data V2 target table owns the displayed ID.",
                    })}
                </Text>
            </MessageStrip>
        </div>
    );
}
