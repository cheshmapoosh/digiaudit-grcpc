import { create } from "zustand";
import { objectiveApi } from "../infra/objective.api.repo";
import type { Objective, ObjectiveCreate, ObjectiveUpdate, ObjectiveMutation } from "../domain/objective.model";

interface ObjectiveState {
  items: Objective[];
  loading: boolean;
  load: () => Promise<void>;
  create: (body: ObjectiveCreate) => Promise<ObjectiveMutation>;
  update: (id: string, body: ObjectiveUpdate) => Promise<ObjectiveMutation>;
  remove: (id: string, version: number, refresh?: boolean) => Promise<void>;
}

export const useObjectiveState = create<ObjectiveState>((set, get) => ({
  items: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    try { set({ items: await objectiveApi.list() }); }
    finally { set({ loading: false }); }
  },
  create: async (body) => {
    const result = await objectiveApi.create(body);
    set(state => ({ items: [...state.items.filter(item => item.id !== result.entityId), result.objective] }));
    return result;
  },
  update: async (id, body) => {
    const result = await objectiveApi.update(id, body);
    set(state => ({ items: state.items.map(item => item.id === id ? result.objective : item) }));
    return result;
  },
  remove: async (id, version, refresh = true) => {
    await objectiveApi.remove(id, version);
    if (refresh) await get().load();
    else set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },
}));
