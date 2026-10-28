import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { Menu, MenuItem } from "@ui5/webcomponents-react";

import type { CentralPolicyNodeType } from "../domain/centralPolicy.model";

const ALL_POLICY_CREATE_TYPES: CentralPolicyNodeType[] = ["GROUP", "POLICY"];


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
  slot?: string;
  style?: CSSProperties;
  nodeTypes: CentralPolicyNodeType[];
  onCreate: (nodeType: CentralPolicyNodeType) => void;
}

function readButtonElement(event: unknown): HTMLElement | undefined {
  const target = (event as ButtonClickEvent).currentTarget;
  return target instanceof HTMLElement ? target : undefined;
}

export default function PolicyCreateMenu({ disabled = false, slot, style, nodeTypes, onCreate }: Props) {
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
        slot={slot}
        className="createMenuButton"
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
