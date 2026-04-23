import { useTranslation } from "react-i18next";
import { List, ListItemCustom, MessageStrip, Text, Title } from "@ui5/webcomponents-react";

import type { PermissionItem } from "@/features/usermanagement";

type PermissionCatalogListProps = {
    title: string;
    items: PermissionItem[];
    emptyTextKey: string;
    emptyTextDefault: string;
};

export default function PermissionCatalogList({
    title,
    items,
    emptyTextKey,
    emptyTextDefault,
}: PermissionCatalogListProps) {
    const { t } = useTranslation();

    return (
        <div style={{ display: "grid", gap: ".75rem" }}>
            <Title level="H5">{title}</Title>

            {items.length === 0 ? (
                <MessageStrip design="Information" hideCloseButton>
                    {t(emptyTextKey, { defaultValue: emptyTextDefault })}
                </MessageStrip>
            ) : (
                <List>
                    {items.map((item) => (
                        <ListItemCustom key={item.id}>
                            <div style={{ display: "grid", gap: ".25rem", padding: ".25rem 0" }}>
                                <div style={{ fontWeight: 700 }}>{item.title || item.code}</div>
                                <Text>{item.code}</Text>
                                <Text>{item.moduleName}</Text>
                                {item.description ? <Text>{item.description}</Text> : null}
                            </div>
                        </ListItemCustom>
                    ))}
                </List>
            )}
        </div>
    );
}
