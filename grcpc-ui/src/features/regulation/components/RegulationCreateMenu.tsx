import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/theming/CustomStyle.js";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

import type { CentralRegulationNodeType } from "../domain/centralRegulation.model";

const REGULATION_CREATE_MENU_BUTTON_CLASS = "regulation-create-menu-button";

addCustomCSS(
  "ui5-button",
  `
    :host(.${REGULATION_CREATE_MENU_BUTTON_CLASS}) .ui5-button-root {
      justify-content: flex-start;
    }
    :host(.${REGULATION_CREATE_MENU_BUTTON_CLASS}) .ui5-button-end-icon {
      margin-left: 0 !important;
      margin-inline-start: auto !important;
    }
  `,
);

const itemIdByType: Record<CentralRegulationNodeType, string> = {
  GROUP: "regulation-create-group",
  REGULATION: "regulation-create-regulation",
  REQUIREMENT: "regulation-create-requirement",
};

const typeByItemId: Record<string, CentralRegulationNodeType> = {
  "regulation-create-group": "GROUP",
  "regulation-create-regulation": "REGULATION",
  "regulation-create-requirement": "REQUIREMENT",
};

type MenuItemClickEvent = {
  detail?: { item?: HTMLElement & { id?: string } };
};

type ButtonClickEvent = { currentTarget?: EventTarget | null };

interface Props {
  disabled?: boolean;
  style?: CSSProperties;
  nodeTypes: CentralRegulationNodeType[];
  onCreate: (nodeType: CentralRegulationNodeType) => void;
}

function readButtonElement(event: unknown): HTMLElement | undefined {
  const target = (event as ButtonClickEvent).currentTarget;
  return target instanceof HTMLElement ? target : undefined;
}

function readNodeType(event: unknown): CentralRegulationNodeType | null {
  const id = (event as MenuItemClickEvent).detail?.item?.id;
  return id ? typeByItemId[id] ?? null : null;
}

export default function RegulationCreateMenu({
  disabled = false,
  style,
  nodeTypes,
  onCreate,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | undefined>();
  const labels = useMemo<Record<CentralRegulationNodeType, string>>(
    () => ({
      GROUP: t("regulation.nodeType.group", { defaultValue: "گروه قانون" }),
      REGULATION: t("regulation.nodeType.regulation", { defaultValue: "قانون" }),
      REQUIREMENT: t("regulation.nodeType.requirement", { defaultValue: "الزام" }),
    }),
    [t],
  );
  const blocked = disabled || nodeTypes.length === 0;
  const menu = (
    <Menu
      open={open}
      opener={opener}
      placement="Bottom"
      horizontalAlign="End"
      onClose={() => setOpen(false)}
      onItemClick={(event) => {
        const type = readNodeType(event);
        if (!type) return;
        setOpen(false);
        onCreate(type);
      }}
    >
      {nodeTypes.map((type) => (
        <MenuItem key={type} id={itemIdByType[type]} text={labels[type]} />
      ))}
    </Menu>
  );

  return (
    <>
      <Button
        className={REGULATION_CREATE_MENU_BUTTON_CLASS}
        design="Emphasized"
        disabled={blocked}
        style={style}
        endIcon="slim-arrow-down"
        accessibilityAttributes={{
          hasPopup: "menu",
          expanded: open ? "true" : "false",
        }}
        onClick={(event) => {
          if (blocked) return;
          setOpener(readButtonElement(event));
          setOpen(true);
        }}
      >
        {t("common.create", { defaultValue: "ایجاد" })}
      </Button>
      {typeof document !== "undefined" && document.body
        ? createPortal(menu, document.body)
        : null}
    </>
  );
}
