import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, Dialog, Input, ObjectStatus, Tree, TreeItemCustom } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type {
  ControlObjectiveAccountGroupOption,
  ControlObjectiveClassificationDraftRow,
} from "../domain/controlObjectiveAccountGroup.model";

interface Props {
  open: boolean;
  options: ControlObjectiveAccountGroupOption[];
  rows: ControlObjectiveClassificationDraftRow[];
  deletedAccountGroupIds: Set<string>;
  busy: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canRestore: boolean;
  onClose: () => void;
  onConfirm: (selected: Set<string>) => void;
}

function matches(
  node: ControlObjectiveAccountGroupOption,
  search: string,
): ControlObjectiveAccountGroupOption | null {
  const children = node.children
    .map((child) => matches(child, search))
    .filter(Boolean) as ControlObjectiveAccountGroupOption[];
  const own = node.code.toLocaleLowerCase().includes(search)
    || node.title.toLocaleLowerCase().includes(search);
  return own || children.length ? { ...node, children } : null;
}

function OptionItem({
  node,
  selected,
  lockedIds,
  busy,
  onToggle,
}: {
  node: ControlObjectiveAccountGroupOption;
  selected: Set<string>;
  lockedIds: Set<string>;
  busy: boolean;
  onToggle: (id: string, checked: boolean) => void;
}) {
  const { t } = useTranslation();
  const disabled = lockedIds.has(node.id) || node.status !== "ACTIVE";
  return (
    <TreeItemCustom
      content={(
        <div className="controlObjectiveAccountGroupTreeContent">
          <CheckBox
            accessibleName={`${node.code} ${node.title}`}
            checked={selected.has(node.id)}
            disabled={busy || disabled}
            onChange={(event) => onToggle(node.id, event.target.checked)}
          />
          <span className="controlObjectiveAccountGroupCode">{node.code}</span>
          <span>{node.title}</span>
          {node.status !== "ACTIVE" ? (
            <ObjectStatus state="None">
              {t("controlObjectiveAccountGroup.status.INACTIVE")}
            </ObjectStatus>
          ) : null}
        </div>
      )}
    >
      {node.children.map((child) => (
        <OptionItem
          key={child.id}
          node={child}
          selected={selected}
          lockedIds={lockedIds}
          busy={busy}
          onToggle={onToggle}
        />
      ))}
    </TreeItemCustom>
  );
}

export default function ControlObjectiveAccountGroupSelectionDialog({
  open,
  options,
  rows,
  deletedAccountGroupIds,
  busy,
  canCreate,
  canDelete,
  canRestore,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setSearch("");
      setSelected(new Set(rows
        .filter((row) => row.editState !== "DRAFT_DELETE")
        .map((row) => row.accountGroupId)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, rows]);

  const tree = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return needle
      ? options.map((node) => matches(node, needle)).filter(Boolean) as ControlObjectiveAccountGroupOption[]
      : options;
  }, [options, search]);
  const persistedIds = useMemo(
    () => new Set(rows
      .filter((row) => row.original && row.original.status !== "DELETED")
      .map((row) => row.accountGroupId)),
    [rows],
  );
  const lockedIds = useMemo(() => {
    const result = canRestore ? new Set<string>() : new Set(deletedAccountGroupIds);
    for (const row of rows) {
      if (row.original && selected.has(row.accountGroupId) && !canDelete
        && row.editState !== "DRAFT_RESTORE") {
        result.add(row.accountGroupId);
      }
    }
    return result;
  }, [canDelete, canRestore, deletedAccountGroupIds, rows, selected]);

  const toggle = (id: string, checked: boolean) => {
    const deleted = deletedAccountGroupIds.has(id);
    if ((checked && deleted && !canRestore)
      || (checked && !deleted && !persistedIds.has(id) && !canCreate)
      || (!checked && persistedIds.has(id) && !canDelete)) return;
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <Dialog
      open={open}
      accessibleName={t("controlObjectiveAccountGroup.selection.title")}
      className="controlObjectiveAccountGroupDialog"
      onClose={onClose}
    >
      <ModalDialogHeader
        title={t("controlObjectiveAccountGroup.selection.title")}
        onClose={onClose}
      />
      <div className="controlObjectiveAccountGroupDialogBody">
        <Input
          value={search}
          placeholder={t("controlObjectiveAccountGroup.selection.search")}
          disabled={busy}
          onInput={(event) => setSearch(event.target.value)}
        />
        <div className="controlObjectiveAccountGroupTreeFrame">
          <Tree accessibleName={t("controlObjectiveAccountGroup.selection.title")}>
            {tree.map((node) => (
              <OptionItem
                key={node.id}
                node={node}
                selected={selected}
                lockedIds={lockedIds}
                busy={busy}
                onToggle={toggle}
              />
            ))}
          </Tree>
        </div>
        <div className="controlObjectiveAccountGroupDialogFooter">
          <Button design="Emphasized" disabled={busy} onClick={() => onConfirm(selected)}>
            {t("controlObjectiveAccountGroup.actions.confirm")}
          </Button>
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
