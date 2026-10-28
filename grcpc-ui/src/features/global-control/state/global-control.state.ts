import { create } from "zustand";
import type {
  ControlGroup, ControlGroupCreate, ControlGroupUpdate, GlobalControl, GlobalControlCreate,
  GlobalControlUpdate, GlobalControlMutation,
} from "../domain/global-control.model";
import { globalControlApi } from "../infra/global-control.api.repo";

interface GlobalControlState {
  groups: ControlGroup[];
  controls: GlobalControl[];
  loading: boolean;
  load: () => Promise<void>;
  createGroup: (body: ControlGroupCreate) => Promise<string>;
  updateGroup: (id: string, body: ControlGroupUpdate) => Promise<void>;
  deleteGroup: (id: string, version: number, refresh?: boolean) => Promise<void>;
  createControl: (body: GlobalControlCreate) => Promise<GlobalControlMutation>;
  updateControl: (id: string, body: GlobalControlUpdate) => Promise<GlobalControlMutation>;
  deleteControl: (id: string, version: number, refresh?: boolean) => Promise<void>;
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
    set(state => ({ groups: [...state.groups.filter(item => item.id !== result.entityId), result.entity] }));
    return result.entityId;
  },
  updateGroup: async (id, body) => {
    const result = await globalControlApi.updateGroup(id, body);
    set(state => ({ groups: state.groups.map(item => item.id === id ? result.entity : item) }));
  },
  deleteGroup: async (id, version, refresh = true) => {
    await globalControlApi.deleteGroup(id, version);
    if (refresh) await get().load();
    else set((state) => ({ groups: state.groups.filter((item) => item.id !== id) }));
  },
  createControl: async (body) => {
    const result = await globalControlApi.createControl(body);
    set(state => ({ controls: [...state.controls.filter(item => item.id !== result.entityId), result.control] }));
    return result;
  },
  updateControl: async (id, body) => {
    const result = await globalControlApi.updateControl(id, body);
    set(state => ({ controls: state.controls.map(item => item.id === id ? result.control : item) }));
    return result;
  },
  deleteControl: async (id, version, refresh = true) => {
    await globalControlApi.deleteControl(id, version);
    if (refresh) await get().load();
    else set((state) => ({ controls: state.controls.filter((item) => item.id !== id) }));
  },
}));
