import { useContext, useRef, useState, type ReactNode } from "react";
import { BusyIndicator, CheckBox, Dialog, FlexBox, List, ListItemStandard, MessageStrip, Text, type ButtonPropTypes } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { CatalogActionButton } from "./CatalogActionButton";
import { CatalogSelectionContext, type CatalogDeleteItem } from "./catalogSelection.context";
import { DialogFooterBar } from "./DialogFooter";
import { ModalDialogHeader } from "./ModalDialogHeader";

interface Props {
  items: CatalogDeleteItem[];
  enabled: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  reload: () => Promise<unknown>;
  reloadOrder?: () => Promise<unknown>;
  onDeleted: (keys: Set<string>) => void;
  mapError: (error: unknown) => string;
  beforeDelete?: (action: () => void) => void;
  children: ReactNode;
}

/** Each remove keeps the existing typed, versioned, guarded server transaction. */
export function CatalogSelectionProvider({ items, enabled, busy, onBusyChange, reload, reloadOrder, onDeleted, mapError, beforeDelete, children }: Props) {
  const { t } = useTranslation();
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<CatalogDeleteItem[]>([]);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [result, setResult] = useState<{ deleted: number; failures: string[] } | null>(null);
  const byKey = new Map(items.map((item) => [item.key, item]));
  const checked = new Set([...checkedKeys].filter((key) => byKey.has(key)));

  const confirm = async () => {
    if (deletingRef.current || busy || !enabled || !pending.length) return;
    deletingRef.current = true;
    setDeleting(true);
    onBusyChange(true);
    const deleted = new Set<string>();
    const failures: string[] = [];
    // Include all ancestors when calculating depth, even if they are not checked.
    const depth = (item: CatalogDeleteItem) => {
      const visited = new Set([item.key]);
      let parent = item.parentKey;
      while (parent && !visited.has(parent)) {
        visited.add(parent);
        parent = byKey.get(parent)?.parentKey;
      }
      return visited.size;
    };
    const ordered = [...pending].sort((a, b) => depth(b) - depth(a) || a.key.localeCompare(b.key));
    try {
      for (const item of ordered) {
        try {
          await item.remove();
          deleted.add(item.key);
        } catch (error) {
          const code = (error as { code?: string; message?: string } | null)?.code
            ?? (error instanceof Error ? error.message : undefined);
          failures.push(`${item.label}: ${code === "HIERARCHY_BUSY" ? t("common.bulkDelete.hierarchyBusy") : mapError(error)}`);
        }
      }
      setCheckedKeys((previous) => new Set([...previous].filter((key) => !deleted.has(key))));
      onDeleted(deleted);
      // Refresh after failures too, so stale versions and hierarchy conflicts are visible.
      try { await reload(); } catch (error) { failures.push(mapError(error)); }
      setPending([]);
      setResult({ deleted: deleted.size, failures });
    } finally {
      deletingRef.current = false;
      setDeleting(false);
      onBusyChange(false);
    }
  };

  const close = () => { if (!deletingRef.current) setPending([]); };
  return <CatalogSelectionContext.Provider value={{
    items: byKey, checked, busy: busy || deleting, enabled,
    reload, reloadOrder: reloadOrder ?? reload, onBusyChange,
    toggle: (key, selected) => {
      if (busy || deleting || !enabled || !byKey.has(key)) return;
      setCheckedKeys((previous) => {
        const next = new Set([...previous].filter((id) => byKey.has(id)));
        if (selected) next.add(key); else next.delete(key);
        return next;
      });
    },
    clear: () => setCheckedKeys(new Set()),
    requestDelete: () => {
      if (busy || deleting || !enabled || !checked.size) return;
      const selection = [...checked].map((key) => byKey.get(key)!);
      const open = () => setPending(selection);
      if (beforeDelete) beforeDelete(open); else open();
    },
  }}>
    {children}
    <Dialog open={pending.length > 0} accessibleName={t("common.bulkDelete.title")} onClose={close}
      onBeforeClose={(event) => { if (deletingRef.current) event.preventDefault(); }}
      footer={<DialogFooterBar>
        <CatalogActionButton design="Negative" disabled={busy || deleting} onClick={() => void confirm()}>{t("common.delete")}</CatalogActionButton>
        <CatalogActionButton design="Transparent" disabled={deleting} onClick={close}>{t("common.cancel")}</CatalogActionButton>
      </DialogFooterBar>}>
      <ModalDialogHeader title={t("common.bulkDelete.title")} onClose={close} />
      <div className="catalogBulkDeleteBody">
        <Text>{t("common.bulkDelete.confirm", { count: pending.length })}</Text>
        {deleting ? <BusyIndicator active delay={0} /> : null}
        <List className="catalogBulkDeleteRows" accessibleName={t("common.bulkDelete.items")}>
          {pending.map((item) => <ListItemStandard key={item.key} wrappingType="Normal">{item.label}</ListItemStandard>)}
        </List>
      </div>
    </Dialog>
    <Dialog open={result !== null} accessibleName={t("common.bulkDelete.resultTitle")} onClose={() => setResult(null)}
      footer={<DialogFooterBar><CatalogActionButton design="Transparent" onClick={() => setResult(null)}>{t("common.close")}</CatalogActionButton></DialogFooterBar>}>
      <ModalDialogHeader title={t("common.bulkDelete.resultTitle")} onClose={() => setResult(null)} />
      <div className="catalogBulkDeleteBody">
        <MessageStrip design={result?.failures.length ? "Information" : "Positive"} hideCloseButton>
          {t("common.bulkDelete.result", { count: result?.deleted ?? 0 })}
        </MessageStrip>
        {result?.failures.length ? <>
          <Text>{t("common.bulkDelete.failures")}</Text>
          <List className="catalogBulkDeleteRows" accessibleName={t("common.bulkDelete.failures")}>
            {result.failures.map((failure, index) => <ListItemStandard key={index} wrappingType="Normal">{failure}</ListItemStandard>)}
          </List>
        </> : null}
      </div>
    </Dialog>
  </CatalogSelectionContext.Provider>;
}

/** Forward UI5's named content slot; checkbox interaction keeps the focused row unchanged. */
export function CatalogSelectableRow({ itemKey, children, slot }: { itemKey: string; children: ReactNode; slot?: string }) {
  const selection = useContext(CatalogSelectionContext);
  const { t } = useTranslation();
  const item = selection?.items.get(itemKey);
  return <FlexBox slot={slot} alignItems="Center" className="catalogSelectableRow">
    {selection && item ? <CheckBox checked={selection.checked.has(itemKey)} disabled={selection.busy || !selection.enabled}
      accessibleName={t("common.bulkDelete.selectItem", { title: item.label })}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
      onChange={(event) => selection.toggle(itemKey, event.target.checked)} /> : null}
    <div className="catalogSelectableContent">{children}</div>
  </FlexBox>;
}

export function CatalogDeleteButton({ disabled, onClick, slot, children, ...props }: ButtonPropTypes) {
  const selection = useContext(CatalogSelectionContext);
  const { t } = useTranslation();
  const count = selection?.checked.size ?? 0;
  if (props.hidden) return null;
  return <>
    <CatalogActionButton {...props} slot={slot} design="Negative"
      disabled={selection?.busy || (count ? !selection?.enabled : disabled)}
      onClick={count ? () => selection?.requestDelete() : onClick}>
      {count ? t("common.bulkDelete.deleteSelected", { count }) : children}
    </CatalogActionButton>
    {count > 0 ? <CatalogActionButton slot={slot} icon="decline" design="Transparent" accessibleName={t("common.clearSelection")}
      disabled={selection?.busy} onClick={() => selection?.clear()} /> : null}
  </>;
}
