import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip, TreeItemCustom, type TreeItemCustomPropTypes } from "@ui5/webcomponents-react";
import { httpClient } from "@/shared/infra/http.client";
import { CatalogSelectionContext } from "./catalogSelection.context";
import { CatalogOrderContext, orderKey, useCatalogTreeOrder, type CatalogOrderName, type CatalogOrderRow, type CatalogOrderState } from "./catalogOrder.context";

interface Props {
  catalog: CatalogOrderName;
  refreshKey: string;
  filtered?: boolean;
  children: ReactNode | ((order: CatalogOrderState) => ReactNode);
}

/** Mount only around a main List Report's tree, never a modal, picker or relationship tab. */
export function CatalogTreeOrder({ catalog, refreshKey, filtered = false, children }: Props) {
  const { t } = useTranslation();
  const selection = useContext(CatalogSelectionContext);
  const [rows, setRows] = useState<CatalogOrderRow[]>([]);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const url = `/api/master-data/display-order/${catalog}`;
  useEffect(() => {
    let current = true;
    const request = ++generation.current;
    void httpClient.get<CatalogOrderRow[]>(url).then((data) => {
      if (current && request === generation.current) { setRows(data); setReadyKey(refreshKey); setLoadError(false); }
    }).catch(() => { if (current) setLoadError(true); });
    return () => { current = false; };
  }, [url, refreshKey]);
  const byKey = new Map(rows.map((row) => [orderKey(row.entityType, row.id), row]));
  const positions = new Map(rows.map((row, index) => [orderKey(row.entityType, row.id), index]));
  const enabled = Boolean(selection?.enabled && !selection.busy && !saving && !filtered && readyKey === refreshKey);
  const sort = <T,>(nodes: T[], key: (node: T) => string) => [...nodes].sort((left, right) =>
    (positions.get(key(left)) ?? Number.MAX_SAFE_INTEGER) - (positions.get(key(right)) ?? Number.MAX_SAFE_INTEGER));
  const sortTree = <T extends { children: T[] },>(nodes: T[], key: (node: T) => string): T[] =>
    sort(nodes, key).map((node) => ({ ...node, children: sortTree(node.children, key) }));
  const resolve = (source: HTMLElement, destination: HTMLElement, placement: string) => {
    if (!enabled || inFlight.current || (placement !== "Before" && placement !== "After")) return null;
    const from = byKey.get(source.dataset.orderKey ?? "");
    const to = byKey.get(destination.dataset.orderKey ?? "");
    return from && to && from !== to && from.parentId === to.parentId && from.parentType === to.parentType ? { from, to } : null;
  };
  const state: CatalogOrderState = {
    busy: saving || Boolean(selection?.busy),
    movable: (key) => enabled && byKey.has(key), sort, sortTree,
    onMoveOver: (event) => {
      const { source, destination } = event.detail;
      if (resolve(source.element, destination.element, destination.placement)) event.preventDefault();
    },
    onMove: (event) => {
      const { source, destination } = event.detail;
      const pair = resolve(source.element, destination.element, destination.placement);
      if (!pair || !selection) return;
      const siblings = rows.filter((row) => row.parentId === pair.from.parentId && row.parentType === pair.from.parentType);
      const next = siblings.filter((row) => row !== pair.from);
      next.splice(next.indexOf(pair.to) + (destination.placement === "After" ? 1 : 0), 0, pair.from);
      if (next.every((row, index) => row === siblings[index])) return;
      inFlight.current = true;
      setSaving(true); selection.onBusyChange(true); setError(null);
      const request = ++generation.current;
      void (async () => {
        try {
          const data = await httpClient.post<CatalogOrderRow[]>(url, {
            source: { entityType: pair.from.entityType, id: pair.from.id },
            destination: { entityType: pair.to.entityType, id: pair.to.id },
            placement: destination.placement.toUpperCase(),
            siblings: siblings.map(({ entityType, id, version }) => ({ entityType, id, version })),
          }, {
            successMessage: t("common.catalogOrder.saved"),
          });
          if (request === generation.current) setRows(data);
        } catch (cause) {
          setError(t((cause as { code?: string })?.code === "CATALOG_ORDER_STALE" ? "common.catalogOrder.stale" : "common.catalogOrder.saveError"));
          try { setRows(await httpClient.get<CatalogOrderRow[]>(url)); } catch { setReadyKey(null); }
        } finally {
          // Refresh canonical entity versions before any subsequent edit/delete.
          try { await selection.reloadOrder(); } catch { setError(t("common.catalogOrder.loadError")); setReadyKey(null); }
          inFlight.current = false; setSaving(false); selection.onBusyChange(false);
        }
      })();
    },
  };
  return <CatalogOrderContext.Provider value={state}>
    {error || loadError ? <MessageStrip design="Negative" onClose={() => { setError(null); setLoadError(false); }}>{error ?? t("common.catalogOrder.loadError")}</MessageStrip> : null}
    {typeof children === "function" ? children(state) : children}
  </CatalogOrderContext.Provider>;
}

export function CatalogOrderedTreeItem({ orderType, orderId, ...props }: TreeItemCustomPropTypes & { orderType?: string; orderId?: string }) {
  const order = useCatalogTreeOrder();
  const key = orderType && orderId ? orderKey(orderType, orderId) : "";
  return <TreeItemCustom {...props} data-order-key={key} movable={Boolean(order?.movable(key))} />;
}
