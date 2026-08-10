import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/theming/CustomStyle.js";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

import type { CentralPolicyNodeType } from "../domain/centralPolicy.model";

const POLICY_CREATE_MENU_BUTTON_CLASS = "policy-create-menu-button";
const ALL_POLICY_CREATE_TYPES: CentralPolicyNodeType[] = ["GROUP", "POLICY"];

addCustomCSS(
  "ui5-button",
  `
    :host(.${POLICY_CREATE_MENU_BUTTON_CLASS}) .ui5-button-root { justify-content: flex-start; }
    :host(.${POLICY_CREATE_MENU_BUTTON_CLASS}) .ui5-button-end-icon {
      margin-left: 0 !important;
      margin-inline-start: auto !important;
    }
  `,
);

const itemIdByType: Record<CentralPolicyNodeType, string> = {
  GROUP: "policy-create-group",
  POLICY: "policy-create-policy",
};
const typeByItemId: Record<string, CentralPolicyNodeType> = {
  "policy-create-group": "GROUP",
  "policy-create-policy": "POLICY",
};

type MenuItemClickEvent = { detail?: { item?: HTMLElement & { id?: string } } };
type ButtonClickEvent = { currentTarget?: EventTarget | null };

interface Props {
  disabled?: boolean;
  style?: CSSProperties;
  nodeTypes: CentralPolicyNodeType[];
  onCreate: (nodeType: CentralPolicyNodeType) => void;
}

function readButtonElement(event: unknown): HTMLElement | undefined {
  const target = (event as ButtonClickEvent).currentTarget;
  return target instanceof HTMLElement ? target : undefined;
}

export default function PolicyCreateMenu({ disabled = false, style, nodeTypes, onCreate }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | undefined>();
  const labels = useMemo<Record<CentralPolicyNodeType, string>>(
    () => ({
      GROUP: t("policy.nodeType.group", { defaultValue: "گروه سیاست" }),
      POLICY: t("policy.nodeType.policy", { defaultValue: "سیاست" }),
    }),
    [t],
  );
  const enabledTypes = useMemo(() => new Set(nodeTypes), [nodeTypes]);
  const blocked = disabled || enabledTypes.size === 0;
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
      {ALL_POLICY_CREATE_TYPES.map((type) => (
        <MenuItem
          key={type}
          id={itemIdByType[type]}
          text={labels[type]}
          disabled={!enabledTypes.has(type)}
        />
      ))}
    </Menu>
  );

  return (
    <>
      <Button
        className={POLICY_CREATE_MENU_BUTTON_CLASS}
        design="Emphasized"
        disabled={blocked}
        style={style}
        endIcon="slim-arrow-down"
        accessibilityAttributes={{ hasPopup: "menu", expanded: open ? "true" : "false" }}
        onClick={(event) => {
          if (blocked) return;
          setOpener(readButtonElement(event));
          setOpen(true);
        }}
      >
        {t("common.create", { defaultValue: "ایجاد" })}
      </Button>
      {typeof document !== "undefined" && document.body ? createPortal(menu, document.body) : null}
    </>
  );
}
