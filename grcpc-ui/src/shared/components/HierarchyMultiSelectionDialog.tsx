import { DialogFooter } from "./DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Button, CheckBox, Dialog, MessageStrip, Text, Tree, TreeItemCustom } from "@ui5/webcomponents-react";
import { ModalDialogHeader } from "./ModalDialogHeader";
import "./hierarchyMultiSelectionDialog.css";

export interface HierarchySelectionNode {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  selectable: boolean;
}

type TreeNode = HierarchySelectionNode & { children: TreeNode[] };
type ToggleEvent = { detail?: { item?: HTMLElement & { dataset?: { nodeId?: string } } }; preventDefault?: () => void };

function buildTree(items: HierarchySelectionNode[]): TreeNode[] {
  const nodes = new Map(items.map((item) => [item.id, { ...item, children: [] as TreeNode[] }]));
  const roots: TreeNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  });
  const sort = (siblings: TreeNode[]) => {
    siblings.sort((a, b) => Number(a.selectable) - Number(b.selectable)
      || a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
    siblings.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query) return nodes;
  return nodes.flatMap((node) => {
    const children = filterTree(node.children, query);
    const matches = `${node.code} ${node.name}`.toLocaleLowerCase().includes(query);
    return matches || children.length ? [{ ...node, children: matches ? node.children : children }] : [];
  });
}

function ChoiceItem({ node, selected, collapsed, search, busy, onToggle }: {
  node: TreeNode;
  selected: Set<string>;
  collapsed: Set<string>;
  search: string;
  busy: boolean;
  onToggle: (id: string, checked: boolean) => void;
}) {
  const label = `${node.code} · ${node.name}`;
  return <TreeItemCustom data-node-id={node.id} expanded={Boolean(search) || !collapsed.has(node.id)}
    content={<div className={node.selectable ? "hierarchyChoiceRow" : "hierarchyChoiceRow hierarchyChoiceGroup"}>
      {node.selectable ? <CheckBox accessibleName={label} checked={selected.has(node.id)} disabled={busy}
        onChange={(event) => onToggle(node.id, event.target.checked)} /> : null}
      <Text>{label}</Text>
    </div>}>
    {node.children.map((child) => <ChoiceItem key={child.id} node={child} selected={selected}
      collapsed={collapsed} search={search} busy={busy} onToggle={onToggle} />)}
  </TreeItemCustom>;
}

export function HierarchyMultiSelectionDialog({ open, title, searchAccessibleName, nodes,
  selectedIds, busy, confirmText, cancelText, onConfirm, onClose, loading = false,
  error, description, confirmDisabled = false, onSelectionChange }: {
  open: boolean;
  title: string;
  searchAccessibleName: string;
  nodes: HierarchySelectionNode[];
  selectedIds: Set<string>;
  busy: boolean;
  confirmText: string;
  cancelText: string;
  onConfirm: (ids: Set<string>) => void;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
  description?: string;
  confirmDisabled?: boolean;
  onSelectionChange?: (ids: Set<string>) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedRef = useRef<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setSearch("");
      const next = new Set(selectedIds);
      selectedRef.current = next;
      setSelected(next);
      setCollapsed(new Set());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, selectedIds]);

  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const query = search.trim().toLocaleLowerCase();
  const visible = useMemo(() => filterTree(tree, query), [tree, query]);
  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selectedRef.current);
    if (checked) next.add(id); else next.delete(id);
    selectedRef.current = next;
    setSelected(next);
    onSelectionChange?.(next);
  };
  const toggleExpansion = (event: ToggleEvent) => {
    event.preventDefault?.();
    const id = event.detail?.item?.dataset?.nodeId;
    if (!id) return;
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const close = () => { if (!busy) onClose(); };
  return <Dialog open={open} accessibleName={title} className="hierarchyMultiSelectionDialog catalogObjectDialog" onClose={close}
    onBeforeClose={(event) => { if (busy) event.preventDefault(); }}>
    <ModalDialogHeader title={title} onClose={close} actions={<HeaderSearch value={search} onChange={(value) => setSearch(value)} disabled={busy || loading} accessibleName={searchAccessibleName} />} />
    <div className="hierarchyMultiSelectionBody" data-catalog-dialog-content>
      {description ? <Text>{description}</Text> : null}
      {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
      {loading ? <BusyIndicator active delay={0} /> : null}
      <div className="hierarchyMultiSelectionTree">
        <Tree accessibleName={title} noDataText={t("common.noData")} inert={busy || loading} onItemToggle={toggleExpansion}>
          {visible.map((node) => <ChoiceItem key={node.id} node={node} selected={selected}
            collapsed={collapsed} search={query} busy={busy} onToggle={toggle} />)}
        </Tree>
      </div>
      <DialogFooter>
        <Button design="Emphasized" disabled={busy || loading || Boolean(error) || confirmDisabled} onClick={() => onConfirm(selected)}>{confirmText}</Button>
        <Button design="Transparent" disabled={busy} onClick={close}>{cancelText}</Button>
      </DialogFooter>
    </div>
  </Dialog>;
}
