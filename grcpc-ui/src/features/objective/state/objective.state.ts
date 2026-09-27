import { create } from "zustand";
import { objectiveApi } from "../infra/objective.api.repo";
import type { Objective, ObjectiveCreate, ObjectiveUpdate } from "../domain/objective.model";

interface ObjectiveState {
  items: Objective[];
  loading: boolean;
  load: () => Promise<void>;
  create: (body: ObjectiveCreate) => Promise<string>;
  update: (id: string, body: ObjectiveUpdate) => Promise<void>;
  remove: (id: string, version: number) => Promise<void>;
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
    await get().load();
    return result.entityId;
  },
  update: async (id, body) => {
    await objectiveApi.update(id, body);
    await get().load();
  },
  remove: async (id, version) => {
    await objectiveApi.remove(id, version);
    await get().load();
  },
}));
