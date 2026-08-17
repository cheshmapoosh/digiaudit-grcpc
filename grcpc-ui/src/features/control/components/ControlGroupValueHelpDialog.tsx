import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Input, List, ListItemStandard } from "@ui5/webcomponents-react";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { CentralControlGroupSummary } from "../domain/centralControl.model";
import { collectControlGroupDescendantIds } from "../utils/centralControl.tree";

interface Props {
  open: boolean;
  groups: CentralControlGroupSummary[];
  currentGroupId?: string | null;
  selectedId: string | null;
  allowEmpty?: boolean;
  busy?: boolean;
  onClose: () => void;
  onSelect: (id: string | null) => void;
}

export default function ControlGroupValueHelpDialog({
  open,
  groups,
  currentGroupId,
  selectedId,
  allowEmpty = true,
  busy = false,
  onClose,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const excluded = useMemo(() => {
    if (!currentGroupId) return new Set<string>();
    const result = collectControlGroupDescendantIds(groups, currentGroupId);
    result.add(currentGroupId);
    return result;
  }, [currentGroupId, groups]);
  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fa");
    return groups.filter((group) => {
      if (excluded.has(group.id)) return false;
      if (!query) return true;
      return `${group.code} ${group.title}`.toLocaleLowerCase("fa").includes(query);
    });
  }, [excluded, groups, search]);
  const title = t("control.group.valueHelpTitle", { defaultValue: "انتخاب گروه کنترل" });
  const select = (id: string | null) => {
    onSelect(id);
    onClose();
  };

  return (
    <Dialog open={open} accessibleName={title} onClose={onClose}>
      <ModalDialogHeader title={title} onClose={onClose} />
      <div style={{ width: "32rem", maxWidth: "80vw", padding: "0.75rem", display: "grid", gap: "0.75rem" }}>
        <Input
          value={search}
          disabled={busy}
          placeholder={t("control.group.search", { defaultValue: "جستجوی گروه کنترل" })}
          onInput={(event) => setSearch(event.target.value)}
        />
        <List separators="Inner">
          {allowEmpty ? (
            <ListItemStandard selected={!selectedId} onClick={() => select(null)}>
              {t("control.group.noParent", { defaultValue: "بدون گروه" })}
            </ListItemStandard>
          ) : null}
          {rows.map((group) => (
            <ListItemStandard
              key={group.id}
              selected={group.id === selectedId}
              additionalText={group.code}
              description={`${group.code} — ${group.title}`}
              onClick={() => select(group.id)}
            >
              {group.title}
            </ListItemStandard>
          ))}
        </List>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.close", { defaultValue: "بستن" })}</Button>
        </div>
      </div>
    </Dialog>
  );
}
