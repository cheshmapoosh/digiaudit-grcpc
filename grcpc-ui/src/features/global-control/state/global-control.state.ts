import { create } from "zustand";
import type {
  ControlGroup, ControlGroupCreate, ControlGroupUpdate, GlobalControl, GlobalControlCreate,
  GlobalControlUpdate,
} from "../domain/global-control.model";
import { globalControlApi } from "../infra/global-control.api.repo";

interface GlobalControlState {
  groups: ControlGroup[];
  controls: GlobalControl[];
  loading: boolean;
  load: () => Promise<void>;
  createGroup: (body: ControlGroupCreate) => Promise<string>;
  updateGroup: (id: string, body: ControlGroupUpdate) => Promise<void>;
  deleteGroup: (id: string, version: number) => Promise<void>;
  createControl: (body: GlobalControlCreate) => Promise<string>;
  updateControl: (id: string, body: GlobalControlUpdate) => Promise<void>;
  deleteControl: (id: string, version: number) => Promise<void>;
}

export const useGlobalControlState = create<GlobalControlState>((set, get) => ({
  groups: [], controls: [], loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const [groups, controls] = await Promise.all([
        globalControlApi.listGroups(), globalControlApi.listControls(),
      ]);
      set({ groups, controls });
    } finally { set({ loading: false }); }
  },
  createGroup: async (body) => {
    const result = await globalControlApi.createGroup(body);
    await get().load();
    return result.entityId;
  },
  updateGroup: async (id, body) => {
    await globalControlApi.updateGroup(id, body);
    await get().load();
  },
  deleteGroup: async (id, version) => {
    await globalControlApi.deleteGroup(id, version);
    await get().load();
  },
  createControl: async (body) => {
    const result = await globalControlApi.createControl(body);
    await get().load();
    return result.entityId;
  },
  updateControl: async (id, body) => {
    await globalControlApi.updateControl(id, body);
    await get().load();
  },
  deleteControl: async (id, version) => {
    await globalControlApi.deleteControl(id, version);
    await get().load();
  },
}));
