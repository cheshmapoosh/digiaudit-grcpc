import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { Menu, MenuItem } from "@ui5/webcomponents-react";
import type { ObjectiveKind } from "../domain/objective.model";

export default function ObjectiveCreateMenu({ disabled, slot, canCreateObjective, onCreate }: {
  disabled: boolean; slot?: string; canCreateObjective: boolean; onCreate: (kind: ObjectiveKind) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement>();
  return <>
    <Button slot={slot} className="createMenuButton" design="Emphasized" disabled={disabled} endIcon="slim-arrow-down"
      accessibilityAttributes={{ hasPopup: "menu", expanded: open ? "true" : "false" }}
      onClick={(event) => { setOpener(event.currentTarget ?? undefined); setOpen(true); }}>
      {t("common.create")}
    </Button>
    {createPortal(<Menu open={open} opener={opener} placement="Bottom" horizontalAlign="End"
      onClose={() => setOpen(false)} onItemClick={(event) => {
        const kind = event.detail.item.dataset.kind;
        if (disabled || (kind !== "STRATEGY" && kind !== "OBJECTIVE")) return;
        if (kind === "OBJECTIVE" && !canCreateObjective) return;
        setOpen(false);
        onCreate(kind);
      }}>
      <MenuItem data-kind="STRATEGY" text={t("objective.strategy.create")} />
      <MenuItem data-kind="OBJECTIVE" text={t("objective.create")} disabled={!canCreateObjective}
        tooltip={!canCreateObjective ? t("objective.createSelectStrategy") : undefined} />
    </Menu>, document.body)}
  </>;
}
