import { createContext } from "react";

export interface CatalogDeleteItem {
  key: string;
  parentKey?: string | null;
  label: string;
  remove: () => Promise<unknown>;
}

export const CatalogSelectionContext = createContext<{
  items: Map<string, CatalogDeleteItem>;
  checked: Set<string>;
  busy: boolean;
  enabled: boolean;
  reload: () => Promise<unknown>;
  reloadOrder: () => Promise<unknown>;
  onBusyChange: (busy: boolean) => void;
  toggle: (key: string, checked: boolean) => void;
  clear: () => void;
  requestDelete: () => void;
} | null>(null);
