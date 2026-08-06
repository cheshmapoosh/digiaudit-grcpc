import { create } from "zustand";
import type { CatalogConfig, CatalogItem } from "../domain/centralCatalog.model";
import { centralCatalogApi } from "../infra/centralCatalog.api";

interface CentralCatalogState {
    items: CatalogItem[];
    parents: CatalogItem[];
    selected: CatalogItem | null;
    loading: boolean;
    error: string | null;
    load(config: CatalogConfig, deleted: boolean, keepId?: string): Promise<CatalogItem | null>;
    select(config: CatalogConfig, id: string): Promise<CatalogItem | null>;
    clearSelection(): void;
    setError(error: string | null): void;
    reset(): void;
}

let requestGeneration = 0;

function messageOf(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
}

export const useCentralCatalogState = create<CentralCatalogState>((set, get) => ({
    items: [],
    parents: [],
    selected: null,
    loading: false,
    error: null,

    async load(config, deleted, keepId) {
        const generation = ++requestGeneration;
        set({ loading: true, error: null });
        try {
            const [items, parents] = await Promise.all([
                centralCatalogApi.list(config, deleted),
                config.parentKind
                    ? centralCatalogApi.list(config.parentKind)
                    : Promise.resolve([]),
            ]);
            if (generation !== requestGeneration) return null;

            const wanted = keepId ?? get().selected?.id;
            const summary = items.find((item) => item.id === wanted) ?? null;
            if (!summary || deleted) {
                set({ items, parents, selected: null });
                return null;
            }

            const detail = await centralCatalogApi.detail(config, summary.id);
            if (generation !== requestGeneration) return null;
            set({ items, parents, selected: detail });
            return detail;
        } catch (cause) {
            if (generation === requestGeneration) set({ error: messageOf(cause) });
            return null;
        } finally {
            if (generation === requestGeneration) set({ loading: false });
        }
    },

    async select(config, id) {
        const generation = ++requestGeneration;
        set({ loading: true, error: null });
        try {
            const detail = await centralCatalogApi.detail(config, id);
            if (generation !== requestGeneration) return null;
            set({ selected: detail });
            return detail;
        } catch (cause) {
            if (generation === requestGeneration) set({ error: messageOf(cause) });
            return null;
        } finally {
            if (generation === requestGeneration) set({ loading: false });
        }
    },

    clearSelection() {
        requestGeneration += 1;
        set({ selected: null, loading: false });
    },

    setError(error) {
        set({ error });
    },

    reset() {
        requestGeneration += 1;
        set({ items: [], parents: [], selected: null, loading: false, error: null });
    },
}));
