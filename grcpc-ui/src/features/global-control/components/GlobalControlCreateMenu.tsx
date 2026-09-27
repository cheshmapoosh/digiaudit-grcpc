import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

type CreateKind = "group" | "control";

export default function GlobalControlCreateMenu({ disabled, controlEnabled, onCreate }: {
  disabled: boolean;
  controlEnabled: boolean;
  onCreate: (kind: CreateKind) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | undefined>();
  return <>
    <Button design="Emphasized" disabled={disabled} endIcon="slim-arrow-down"
      accessibilityAttributes={{ hasPopup: "menu", expanded: open ? "true" : "false" }}
      onClick={(event) => {
        setOpener(event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined);
        setOpen(true);
      }}>{t("common.create")}</Button>
    {typeof document !== "undefined" && document.body ? createPortal(
      <Menu open={open} opener={opener} placement="Bottom" horizontalAlign="End"
        onClose={() => setOpen(false)}
        onItemClick={(event) => {
          const id = event.detail.item?.id;
          if (id === "global-create-group" || (id === "global-create-control" && controlEnabled)) {
            setOpen(false);
            onCreate(id === "global-create-group" ? "group" : "control");
          }
        }}>
        <MenuItem id="global-create-group" text={t("globalControl.group.create")} />
        <MenuItem id="global-create-control" text={t("globalControl.control.create")}
          disabled={!controlEnabled} />
      </Menu>, document.body) : null}
  </>;
}
