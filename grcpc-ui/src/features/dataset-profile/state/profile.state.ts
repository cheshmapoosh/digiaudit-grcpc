import { create } from "zustand";
import { profileApi } from "../infra/profile.api.repo";
import type { DatasetProfile } from "../domain/profile.model";
import { beginProfileSession, initializeProfileSelection, selectedProfileId } from "@/shared/infra/profileSelection";

interface State {
  profiles: DatasetProfile[];
  loaded: boolean;
  loading: boolean;
  userId: string | null;
  error: string | null;
  load: (userId?: string) => Promise<void>;
  reset: () => void;
}
let requestGeneration = 0;
export const useProfileState = create<State>((set, get) => ({
  profiles: [], loaded: false, loading: false, userId: null, error: null,
  load: async (userId) => {
    const owner = userId ?? get().userId;
    if (!owner) return;
    const differentOwner = get().userId !== owner;
    if (userId) beginProfileSession(userId);
    const generation = ++requestGeneration;
    set({ loading: true, userId: owner, ...(differentOwner ? { profiles: [], loaded: false } : {}) });
    try {
      const profiles = (await profileApi.list()).filter((profile) => profile.status !== "DELETED");
      if (generation !== requestGeneration || get().userId !== owner) return;
      // Initialization runs before authenticated pages mount. Live scope changes
      // still go through the router blocker and a full navigation in the selector.
      if (userId) initializeProfileSelection(userId, profiles.map((profile) => profile.id));
      set({ profiles, loaded: true, loading: false, error: null });
    } catch (error) {
      if (generation !== requestGeneration || get().userId !== owner) return;
      // A transient refresh failure must not unmount an editor with an unsaved draft.
      set({ loaded: true, loading: false, error: error instanceof Error ? error.message : "PROFILE_LOAD_FAILED" });
    }
  },
  reset: () => {
    requestGeneration++;
    set({ profiles: [], loaded: false, loading: false, userId: null, error: null });
  },
}));
export function currentProfile() {
  return useProfileState.getState().profiles.find((p) => p.id === selectedProfileId() && p.status !== "DELETED");
}
