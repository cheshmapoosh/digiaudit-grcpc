import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button, Dialog, FlexBox, MessageStrip, RadioButton, Tag, Text, Tree, TreeItemCustom,
} from "@ui5/webcomponents-react";
import { DialogFooter } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { Objective } from "../domain/objective.model";
import "../pages/objective.css";

type Node = Objective & { children: Node[] };
type ToggleEvent = { detail?: { item?: HTMLElement }; preventDefault: () => void };
interface Props {
  open: boolean;
  items: Objective[];
  selectableIds: ReadonlySet<string>;
  selectedId: string | null;
  busy: boolean;
  onConfirm: (id: string) => void;
  onClose: () => void;
}

function buildTree(items: Objective[]): Node[] {
  const nodes = new Map(items.filter((item) => item.status !== "DELETED")
    .map((item) => [item.id, { ...item, children: [] as Node[] }]));
  const roots: Node[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentObjectiveId ? nodes.get(node.parentObjectiveId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (siblings: Node[]) => {
    siblings.sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name, "fa"));
    siblings.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

function filterTree(nodes: Node[], query: string): Node[] {
  if (!query) return nodes;
  return nodes.flatMap((node) => {
    if (`${node.code} ${node.name}`.toLocaleLowerCase("fa").includes(query)) return [node];
    const children = filterTree(node.children, query);
    return children.length ? [{ ...node, children }] : [];
  });
}

function Choice({ node, selectedId, selectableIds, collapsed, groupName, busy, onSelect }: {
  node: Node; selectedId: string | null; selectableIds: ReadonlySet<string>;
  collapsed: ReadonlySet<string>; groupName: string; busy: boolean; onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const label = `${node.code} · ${node.name}`;
  const selectable = node.kind === "OBJECTIVE" && node.status === "ACTIVE" && selectableIds.has(node.id);
  return <TreeItemCustom data-objective-id={node.id} expanded={!collapsed.has(node.id)}
    content={<FlexBox alignItems="Center" className="objectiveSelectionRow">
      {node.kind === "OBJECTIVE" ? <RadioButton name={groupName} text={label}
        accessibleName={label} checked={selectedId === node.id} disabled={busy || !selectable}
        onChange={(event) => { if (event.target.checked && selectable) onSelect(node.id); }} />
        : <><Text>{label}</Text><Tag>{t("objective.kind.STRATEGY")}</Tag></>}
      {node.kind === "OBJECTIVE" && !selectable ? <Tag>{t("objective.selection.unavailable")}</Tag> : null}
    </FlexBox>}>
    {node.children.map((child) => <Choice key={child.id} node={child} selectedId={selectedId}
      selectableIds={selectableIds} collapsed={collapsed} groupName={groupName} busy={busy} onSelect={onSelect} />)}
  </TreeItemCustom>;
}

function OpenObjectiveSelectionDialog({ items, selectableIds, selectedId: initialId, busy, onConfirm, onClose }: Omit<Props, "open">) {
  const { t } = useTranslation();
  const groupName = useId();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(initialId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const tree = useMemo(() => buildTree(items), [items]);
  const visible = useMemo(() => filterTree(tree, search.trim().toLocaleLowerCase("fa")), [tree, search]);
  const canConfirm = Boolean(selectedId && selectableIds.has(selectedId)
    && items.some((item) => item.id === selectedId && item.kind === "OBJECTIVE" && item.status === "ACTIVE"));
  const toggleExpansion = (event: ToggleEvent) => {
    event.preventDefault();
    const id = event.detail?.item?.dataset.objectiveId;
    if (!id) return;
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  return <Dialog open className="objectiveDialog" accessibleName={t("objective.selection.title")} onClose={onClose}>
    <ModalDialogHeader title={t("objective.selection.title")} onClose={onClose}
      actions={<HeaderSearch value={search} disabled={busy} accessibleName={t("objective.selection.search")}
        onChange={(value) => { setSearch(value); setCollapsed(new Set()); }} />} />
    <FlexBox direction="Column" className="objectiveSelectionBody">
      <Text>{t("objective.selection.help")}</Text>
      {visible.length ? <Tree onItemToggle={toggleExpansion}>
        {visible.map((node) => <Choice key={node.id} node={node} selectedId={selectedId}
          selectableIds={selectableIds} collapsed={collapsed} groupName={groupName}
          busy={busy} onSelect={setSelectedId} />)}
      </Tree> : <MessageStrip design="Information" hideCloseButton>{t("common.noData")}</MessageStrip>}
    </FlexBox>
    <DialogFooter>
      <Button design="Emphasized" disabled={busy || !canConfirm}
        onClick={() => { if (selectedId && canConfirm) onConfirm(selectedId); }}>
        {t("common.confirm")}
      </Button>
      <Button design="Transparent" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button>
    </DialogFooter>
  </Dialog>;
}

export default function ObjectiveSelectionDialog({ open, ...props }: Props) {
  return open ? <OpenObjectiveSelectionDialog {...props} /> : null;
}
