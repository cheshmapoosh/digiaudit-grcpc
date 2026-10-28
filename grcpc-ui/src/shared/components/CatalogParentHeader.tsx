import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, FlexBox, Grid, Label, ObjectStatus, Text, Title } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import "./modal-layout.css";

interface CatalogParentSummary {
  code: string;
  title: string;
  type: string;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
}

interface CatalogParentHeaderProps {
  objectTitle: string;
  label?: string;
  parent?: CatalogParentSummary | null;
  parentId?: string | null;
  required?: boolean;
  standalone?: boolean;
  selection?: ReactNode;
  busy?: boolean;
  onClearParent?: () => void;
}

/** The form retains ownership of its parent draft and portals its summary into the native dialog header. */
export function CatalogParentHeader({ objectTitle, label, parent, parentId, required = false, standalone = false, selection, busy = false, onClearParent }: CatalogParentHeaderProps) {
  const { t } = useTranslation();
  const [header, setHeader] = useState<HTMLElement | null>(null);
  const bindAnchor = useCallback((element: HTMLElement | null) => {
    if (element) setHeader(element.closest("ui5-dialog")?.querySelector<HTMLElement>("[data-catalog-parent-header]") ?? null);
  }, []);
  const missing = !parent && Boolean(parentId || required);
  const missingKey = parentId ? "catalog.parentHeader.unavailable" : "catalog.parentHeader.unselected";
  const contextStatus = parent
    ? t(`catalog.parentHeader.status.${parent.status}`)
    : t(missing ? missingKey : standalone ? "catalog.parentHeader.standalone" : "catalog.parentHeader.noParent");
  const title = parent?.title ?? t(missing ? missingKey : "catalog.parentHeader.rootTitle");
  const type = parent?.type ?? (missing ? "—" : t(standalone ? "catalog.parentHeader.standalone" : "catalog.parentHeader.rootType"));
  const canClearParent = Boolean(parentId && onClearParent && !required && !standalone);

  return <>
    <FlexBox ref={bindAnchor} style={{ display: "none" }} />
    {header ? createPortal(
      <FlexBox as="section" direction="Column" className="catalogParentHeader" aria-label={label ?? t("catalog.parentHeader.label")}>
        <FlexBox justifyContent="SpaceBetween" alignItems="Center" wrap="Wrap" className="catalogParentHeaderToolbar">
          <FlexBox direction="Column" className="catalogParentHeaderIdentity">
            <Title level="H4" wrappingType="Normal">{objectTitle}</Title>
            <Label showColon required={required}>{label ?? t("catalog.parentHeader.label")}</Label>
          </FlexBox>
          {selection || canClearParent ? <FlexBox alignItems="Center" wrap="Wrap" className="catalogParentHeaderActions">
            {selection}
            {canClearParent ? <Button design="Transparent" disabled={busy} onClick={onClearParent}>{t("catalog.parentHeader.clear")}</Button> : null}
          </FlexBox> : null}
        </FlexBox>
        <Grid defaultSpan="XL3 L3 M6 S6" className="catalogParentHeaderFields">
          <FlexBox direction="Column"><Label showColon>{t("catalog.parentHeader.code")}</Label><Text className="objectPageValue">{parent?.code || "—"}</Text></FlexBox>
          <FlexBox direction="Column"><Label showColon>{t("catalog.parentHeader.title")}</Label><Text maxLines={2} title={title} className="objectPageValue">{title}</Text></FlexBox>
          <FlexBox direction="Column"><Label showColon>{t("catalog.parentHeader.type")}</Label><Text className="objectPageValue">{type}</Text></FlexBox>
          <FlexBox direction="Column"><Label showColon>{t("common.status")}</Label><ObjectStatus state={parent?.status === "ACTIVE" ? "Positive" : parent?.status === "DELETED" ? "Negative" : missing ? "Information" : "None"}>{contextStatus}</ObjectStatus></FlexBox>
        </Grid>
      </FlexBox>, header,
    ) : null}
  </>;
}
