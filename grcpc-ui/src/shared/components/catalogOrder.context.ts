import { createContext, useContext } from "react";
import type { TreePropTypes } from "@ui5/webcomponents-react";

export type CatalogOrderName = "ORGANIZATION" | "PROCESS" | "CONTROL" | "RISK" | "REGULATION" | "POLICY" | "ACCOUNT_GROUP" | "OBJECTIVE" | "GLOBAL_CONTROL";
export interface CatalogOrderRow {
  entityType: string; id: string; parentType: string | null; parentId: string | null;
  displayOrder: number | null; version: number; createdAt: string;
}
export const orderKey = (entityType: string, id: string) => `${entityType}:${id}`;
export interface CatalogOrderState {
  busy: boolean;
  movable: (key: string) => boolean;
  sort: <T>(nodes: T[], key: (node: T) => string) => T[];
  sortTree: <T extends { children: T[] }>(nodes: T[], key: (node: T) => string) => T[];
  onMove: (event: Parameters<NonNullable<TreePropTypes["onMove"]>>[0], selectSource: (source: HTMLElement) => void) => void;
  onDragEnd: (event: Parameters<NonNullable<TreePropTypes["onDragEnd"]>>[0], selectSource: (source: HTMLElement) => void) => void;
  onMoveOver: NonNullable<TreePropTypes["onMoveOver"]>;
}
export const CatalogOrderContext = createContext<CatalogOrderState | null>(null);
/** Shared tree components keep their existing behavior outside a main-page provider. */
export function useCatalogTreeOrder() { return useContext(CatalogOrderContext); }
