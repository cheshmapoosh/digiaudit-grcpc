import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { DialogFooter } from "@/shared/components/DialogFooter";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, List, ListItemStandard, Tree, TreeItem } from "@ui5/webcomponents-react";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { CentralControlGroupSummary } from "../domain/centralControl.model";
import { buildCentralControlTree, collectControlGroupDescendantIds, filterCentralControlTree, type CentralControlTreeNode } from "../utils/centralControl.tree";

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
    const eligible = groups.filter((group) => !excluded.has(group.id));
    return filterCentralControlTree(buildCentralControlTree(eligible, []), search);
  }, [excluded, groups, search]);
  const title = t("control.group.valueHelpTitle", { defaultValue: "انتخاب گروه کنترل" });
  const select = (id: string | null) => {
    if (busy) return;
    onSelect(id);
    onClose();
  };
  const renderGroup = (group: CentralControlTreeNode) => (
    <TreeItem key={group.id} data-group-id={group.id} text={`${group.code} — ${group.title}`}
      expanded selected={group.id === selectedId}>
      {group.children.map(renderGroup)}
    </TreeItem>
  );

  return (
    <Dialog open={open} accessibleName={title} onClose={onClose}>
      <ModalDialogHeader title={title} onClose={onClose}  actions={<HeaderSearch value={search} onChange={(value) => setSearch(value)} disabled={busy} accessibleName={t("control.group.search", { defaultValue: "جستجوی گروه کنترل" })} />} />
      <div className="controlGroupValueHelp">

          {allowEmpty ? <List separators="Inner">
            <ListItemStandard selected={!selectedId} type={busy ? "Inactive" : "Active"} onClick={() => select(null)}>
              {t("control.group.noParent", { defaultValue: "بدون گروه" })}
            </ListItemStandard>
          </List> : null}
        <Tree accessibleName={title} onItemClick={(event) => {
          const id = event.detail.item.dataset.groupId;
          if (id && !excluded.has(id)) select(id);
        }}>{rows.map(renderGroup)}</Tree>
        <DialogFooter>
          <Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.close", { defaultValue: "بستن" })}</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
