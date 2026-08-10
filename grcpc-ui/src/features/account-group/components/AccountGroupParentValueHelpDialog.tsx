import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Dialog,
  Input,
  List,
  ListItemStandard,
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
    <Dialog open={open} accessibleName={title} className="accountGroupParentDialog" onClose={onClose}>
      <ModalDialogHeader title={title} onClose={onClose} />
      <div className="accountGroupParentDialogContent">
        <Input
          value={searchText}
          disabled={busy}
          placeholder={t("accountGroup.parent.search")}
          onInput={(event) => setSearchText(event.target.value)}
        />
        <List separators="Inner">
          <ListItemStandard selected={!selectedParentId} onClick={() => onSelect(null)}>
            {t("accountGroup.parent.none")}
          </ListItemStandard>
        </List>
        <div className="accountGroupParentTreeFrame">
          <Tree
            accessibleName={title}
            onItemClick={(event: TreeEvent) => {
              const id = event.detail?.item?.dataset?.nodeId;
              if (id) onSelect(id);
            }}
          >
            {tree.map((node) => (
              <ParentTreeItem key={node.id} node={node} selectedParentId={selectedParentId} />
            ))}
          </Tree>
        </div>
        <div className="accountGroupParentDialogFooter">
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.close", { defaultValue: "بستن" })}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
