import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/theming/CustomStyle.js";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

import type { CentralControlNodeType } from "../domain/centralControl.model";

const BUTTON_CLASS = "control-create-menu-button";
const ALL_TYPES: CentralControlNodeType[] = ["GROUP", "CONTROL"];

addCustomCSS(
  "ui5-button",
  `
    :host(.${BUTTON_CLASS}) .ui5-button-root { justify-content: flex-start; }
    :host(.${BUTTON_CLASS}) .ui5-button-end-icon {
      margin-left: 0 !important;
      margin-inline-start: auto !important;
    }
  `,
);

const itemIdByType: Record<CentralControlNodeType, string> = {
  GROUP: "control-create-group",
  CONTROL: "control-create-control",
};
const typeByItemId: Record<string, CentralControlNodeType> = {
  "control-create-group": "GROUP",
  "control-create-control": "CONTROL",
};

type MenuItemClickEvent = { detail?: { item?: HTMLElement & { id?: string } } };
type ButtonClickEvent = { currentTarget?: EventTarget | null };

interface Props {
  disabled?: boolean;
  style?: CSSProperties;
  nodeTypes: CentralControlNodeType[];
  onCreate: (nodeType: CentralControlNodeType) => void;
}

export default function ControlCreateMenu({ disabled = false, style, nodeTypes, onCreate }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | undefined>();
  const enabledTypes = useMemo(() => new Set(nodeTypes), [nodeTypes]);
  const blocked = disabled || enabledTypes.size === 0;
  const labels = useMemo<Record<CentralControlNodeType, string>>(
    () => ({
      GROUP: t("control.nodeType.group", { defaultValue: "گروه کنترل" }),
      CONTROL: t("control.nodeType.control", { defaultValue: "کنترل" }),
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
        const id = (event as MenuItemClickEvent).detail?.item?.id;
        const type = id ? typeByItemId[id] : null;
        if (!type || !enabledTypes.has(type)) return;
        setOpen(false);
        onCreate(type);
      }}
    >
      {ALL_TYPES.map((type) => (
        <MenuItem key={type} id={itemIdByType[type]} text={labels[type]} disabled={!enabledTypes.has(type)} />
      ))}
    </Menu>
  );

  return (
    <>
      <Button
        className={BUTTON_CLASS}
        design="Emphasized"
        disabled={blocked}
        style={style}
        endIcon="slim-arrow-down"
        accessibilityAttributes={{ hasPopup: "menu", expanded: open ? "true" : "false" }}
        onClick={(event) => {
          if (blocked) return;
          const target = (event as ButtonClickEvent).currentTarget;
          setOpener(target instanceof HTMLElement ? target : undefined);
          setOpen(true);
        }}
      >
        {t("common.create", { defaultValue: "ایجاد" })}
      </Button>
      {typeof document !== "undefined" && document.body ? createPortal(menu, document.body) : null}
    </>
  );
}
