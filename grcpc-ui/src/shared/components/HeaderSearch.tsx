import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/Theming.js";
import { Button, FlexBox, Popover, Search, type SearchDomRef } from "@ui5/webcomponents-react";
import "./management-pages.css";

// UI5 Search has no public placement option for its native search icon.
void addCustomCSS("ui5-search", `
  :host([data-grcpc-header-search]:dir(rtl)) .ui5-search-field-content > .ui5-shell-search-field-icon:last-child {
    order: -1;
  }
`);

export function HeaderSearch({ value, onChange, disabled = false, accessibleName, slot }: {
  value: string; onChange: (value: string) => void; disabled?: boolean; accessibleName?: string; slot?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const openerId = useId();
  const search = useRef<SearchDomRef>(null);
  return <FlexBox slot={slot} alignItems="Center" className="managementHeaderSearch">
    <Button id={openerId} icon="search" disabled={disabled} design={open || value ? "Emphasized" : "Transparent"} accessibleName={accessibleName ?? t("common.search")}
      tooltip={value ? `${accessibleName ?? t("common.search")}: ${value}` : accessibleName ?? t("common.search")}
      accessibilityAttributes={{ hasPopup: "dialog", expanded: open ? "true" : "false" }} onClick={() => setOpen(!open)} />
    <Popover open={open} opener={openerId} headerText={accessibleName ?? t("common.search")} placement="Bottom"
      onOpen={() => search.current?.focus()} onClose={() => setOpen(false)}>
      <Search ref={search} data-grcpc-header-search="" accessibleName={accessibleName ?? t("common.search")} value={value} showClearIcon noTypeahead placeholder="" inert={disabled}
        onInput={(event) => onChange(event.target.value)} onSearch={(event) => { event.preventDefault(); setOpen(false); }} />
    </Popover>
  </FlexBox>;
}
