import { create } from "zustand";
import type { RegulationEntity, RegulationId, RegulationUpsertInput } from "../model/regulation.types";
import { regulationService } from "../service/regulation.service";

interface RegulationState {
    items: RegulationEntity[];
    selectedId: RegulationId | null;
    isLoading: boolean;
    error: string | null;

    load: () => Promise<void>;
    select: (id: RegulationId | null) => void;

    create: (input: RegulationUpsertInput) => Promise<RegulationEntity>;
    update: (id: RegulationId, input: RegulationUpsertInput) => Promise<RegulationEntity>;
    remove: (id: RegulationId) => Promise<void>;
}

export const useRegulationStore = create<RegulationState>((set, get) => ({
    items: [],
    selectedId: null,
    isLoading: false,
    error: null,

    load: async () => {
        set({ isLoading: true, error: null });
        try {
            const items = await regulationService.list();
            set({ items, isLoading: false });
            // اگر انتخاب قبلی حذف شده باشد
            const { selectedId } = get();
            if (selectedId && !items.some((x) => x.id === selectedId)) {
                set({ selectedId: null });
            }
        } catch (e: any) {
            set({ isLoading: false, error: e?.message ?? "Load failed" });
        }
    },

    select: (id) => set({ selectedId: id }),

    create: async (input) => {
        const entity = await regulationService.create(input);
        set({ items: [...get().items, entity] });
        return entity;
    },

    update: async (id, input) => {
        const updated = await regulationService.update(id, input);
        set({ items: get().items.map((x) => (x.id === id ? updated : x)) });
        return updated;
    },

    remove: async (id) => {
        await regulationService.delete(id);
        // بعد از delete، reload برای سازگاری subtree
        await get().load();
    },
}));