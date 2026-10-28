import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { DialogFooter } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  Tree,
  TreeItemCustom,
} from "@ui5/webcomponents-react";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { CentralAccountGroupSummary } from "../domain/centralAccountGroup.model";
import {
  buildAccountGroupTree,
  collectAccountGroupDescendantIds,
  filterAccountGroupTree,
  type CentralAccountGroupTreeNode,
} from "../utils/centralAccountGroup.tree";

interface Props {
  open: boolean;
  rows: CentralAccountGroupSummary[];
  currentId?: string | null;
  selectedParentId?: string | null;
  busy?: boolean;
  onClose: () => void;
  onSelect: (parentId: string | null) => void;
}

type TreeEvent = {
  detail?: { item?: HTMLElement & { dataset?: { nodeId?: string } } };
};

function ParentTreeItem({
  node,
  selectedParentId,
}: {
  node: CentralAccountGroupTreeNode;
  selectedParentId?: string | null;
}) {
  return (
    <TreeItemCustom
      data-node-id={node.id}
      expanded
      selected={node.id === selectedParentId}
      content={
        <div className="accountGroupParentTreeContent" title={`${node.code} — ${node.title}`}>
          <span>{node.title}</span>
          <small>{node.code}</small>
        </div>
      }
    >
      {node.children.map((child) => (
        <ParentTreeItem key={child.id} node={child} selectedParentId={selectedParentId} />
      ))}
    </TreeItemCustom>
  );
}

export default function AccountGroupParentValueHelpDialog({
  open,
  rows,
  currentId,
  selectedParentId,
  busy = false,
  onClose,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const excludedIds = useMemo(
    () => new Set([...(currentId ? [currentId] : []), ...collectAccountGroupDescendantIds(rows, currentId)]),
    [currentId, rows],
  );
  const selectableRows = useMemo(
    () => rows.filter((row) => !excludedIds.has(row.id)),
    [excludedIds, rows],
  );
  const tree = useMemo(
    () => filterAccountGroupTree(buildAccountGroupTree(selectableRows), searchText),
    [searchText, selectableRows],
  );
  const title = t("accountGroup.parent.dialogTitle");

  return (
    <Dialog open={open} accessibleName={title} className="accountGroupParentDialog catalogObjectDialog" onClose={onClose}>
      <ModalDialogHeader title={title} onClose={onClose}  actions={<HeaderSearch value={searchText} onChange={(value) => setSearchText(value)} disabled={busy} accessibleName={t("accountGroup.parent.search")} />} />
      <div className="accountGroupParentDialogContent">

        <div className="accountGroupParentTreeFrame">
          <Tree
            accessibleName={title}
            noDataText={t("common.noData")}
            onItemClick={(event: TreeEvent) => {
              const id = event.detail?.item?.dataset?.nodeId;
              if (id && !busy) onSelect(id);
            }}
          >
            {tree.map((node) => (
              <ParentTreeItem key={node.id} node={node} selectedParentId={selectedParentId} />
            ))}
          </Tree>
        </div>
        <DialogFooter>
          {selectedParentId ? <Button design="Negative" disabled={busy} onClick={() => { onSelect(null); onClose(); }}>{t("catalog.parentHeader.clear")}</Button> : null}
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.close", { defaultValue: "بستن" })}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
