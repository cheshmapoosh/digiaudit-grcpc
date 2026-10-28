import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

import type { CentralRiskCreateKind } from "../domain/centralRisk.model";



const kindByMenuItemId: Record<string, CentralRiskCreateKind> = {
  "risk-create-menu-category": "category",
  "risk-create-menu-template": "template",
};

type MenuItemClickEvent = {
  detail?: {
    item?: HTMLElement & { id?: string };
  };
};

type ButtonClickEvent = {
  currentTarget?: EventTarget | null;
};

interface Props {
  disabled?: boolean;
  slot?: string;
  templateEnabled: boolean;
  style?: CSSProperties;
  onCreate: (kind: CentralRiskCreateKind) => void;
}

function readButtonElement(event: unknown): HTMLElement | undefined {
  const currentTarget = (event as ButtonClickEvent).currentTarget;
  return currentTarget instanceof HTMLElement ? currentTarget : undefined;
}

function readKind(event: unknown): CentralRiskCreateKind | null {
  const id = (event as MenuItemClickEvent).detail?.item?.id;
  return id ? kindByMenuItemId[id] ?? null : null;
}

function canUsePortal(): boolean {
  return typeof document !== "undefined" && Boolean(document.body);
}

export default function CentralRiskCreateMenu({
  disabled = false,
  slot,
  templateEnabled,
  style,
  onCreate,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | undefined>(undefined);

  const labels = useMemo(
    () => ({
      category: t("risk.nodeType.category"),
      template: t("risk.nodeType.template"),
    }),
    [t],
  );

  const menu = (
    <Menu
      open={open}
      opener={opener}
      placement="Bottom"
      horizontalAlign="End"
      onClose={() => setOpen(false)}
      onItemClick={(event) => {
        const kind = readKind(event);
        if (!kind || (kind === "template" && !templateEnabled)) return;
        setOpen(false);
        onCreate(kind);
      }}
    >
      <MenuItem id="risk-create-menu-category" text={labels.category} />
      <MenuItem
        id="risk-create-menu-template"
        text={labels.template}
        disabled={!templateEnabled}
      />
    </Menu>
  );

  return (
    <>
      <Button
        slot={slot}
        className="createMenuButton"
        design="Emphasized"
        disabled={disabled}
        style={style}
        endIcon="slim-arrow-down"
        accessibilityAttributes={{
          hasPopup: "menu",
          expanded: open ? "true" : "false",
        }}
        onClick={(event) => {
          if (disabled) return;
          setOpener(readButtonElement(event));
          setOpen(true);
        }}
      >
        {t("common.create", { defaultValue: "ایجاد" })}
      </Button>
      {canUsePortal() ? createPortal(menu, document.body) : null}
    </>
  );
}
