import { Label, Text } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import "./catalog-tree-columns.css";

export function CatalogTreeHeader({ withType = false, slot }: { withType?: boolean; slot?: string }) {
    const { t } = useTranslation();
    return (
        <div slot={slot} className="catalogTreeColumns catalogTreeColumnHeader" data-with-type={withType || undefined}>
            <Label>{t("catalog.tree.title")}</Label>
            {withType ? <Label>{t("catalog.tree.type")}</Label> : null}
        </div>
    );
}

export function CatalogTreeRow({ title, type, tooltip }: { title: string; type?: string; tooltip?: string }) {
    return (
        <div className="catalogTreeColumns" data-with-type={type !== undefined || undefined}>
            <Text maxLines={1} title={tooltip ?? title}>{title}</Text>
            {type !== undefined ? <Text maxLines={1} title={type}>{type}</Text> : null}
        </div>
    );
}
