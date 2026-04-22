import { create } from "zustand";
import type {
  ProcessNode,
  ProcessNodeCreate,
  ProcessNodeUpdate,
} from "@/features/process";
import { processService } from "@/features/process";

export const ROOT_PARENT = "ROOT_PARENT";

interface ProcessState {
  nodesById: Record<string, ProcessNode>;
  childrenByParent: Record<string, ProcessNode[]>;
  loadedChildren: Record<string, boolean>;
  loading: boolean;

  loadChildren(parentId?: string): Promise<void>;
  createNode(parentId: string | null, payload: ProcessNodeCreate): Promise<ProcessNode>;
  updateNode(id: string, payload: ProcessNodeUpdate): Promise<void>;
  removeNode(id: string): Promise<void>;
  toggleStatus(id: string): Promise<void>;
  refresh(): Promise<void>;
  reset(): void;
}

function toParentKey(parentId?: string | null): string {
  return parentId ?? ROOT_PARENT;
}

function buildIndexes(nodes: ProcessNode[]) {
  const nodesById: Record<string, ProcessNode> = {};
  const childrenByParent: Record<string, ProcessNode[]> = {};

  for (const node of nodes) {
    nodesById[node.id] = node;

    const key = toParentKey(node.parentId);
    if (!childrenByParent[key]) {
      childrenByParent[key] = [];
    }

    childrenByParent[key].push(node);
  }

  return { nodesById, childrenByParent };
}

export const useProcessState = create<ProcessState>((set) => ({
  nodesById: {},
  childrenByParent: {},
  loadedChildren: {},
  loading: false,

  async refresh() {
    set({ loading: true });

    try {
      const allNodes = await processService.list();
      const { nodesById, childrenByParent } = buildIndexes(allNodes);

      set((state) => ({
        nodesById,
        childrenByParent,
        loadedChildren: {
          ...state.loadedChildren,
          [ROOT_PARENT]: true,
        },
      }));
    } finally {
      set({ loading: false });
    }
  },

  async loadChildren(parentId = ROOT_PARENT) {
    set({ loading: true });

    try {
      const allNodes = await processService.list();
      const { nodesById, childrenByParent } = buildIndexes(allNodes);

      set((state) => ({
        nodesById,
        childrenByParent,
        loadedChildren: {
          ...state.loadedChildren,
          [parentId]: true,
        },
      }));
    } finally {
      set({ loading: false });
    }
  },

  async createNode(parentId, payload) {
    set({ loading: true });

    try {
      const createdNode = await processService.create({
        ...payload,
        parentId: parentId === ROOT_PARENT ? null : parentId,
      });

      const allNodes = await processService.list();
      const { nodesById, childrenByParent } = buildIndexes(allNodes);

      set((state) => ({
        nodesById,
        childrenByParent,
        loadedChildren: {
          ...state.loadedChildren,
          [toParentKey(parentId)]: true,
        },
      }));

      return createdNode;
    } finally {
      set({ loading: false });
    }
  },

  async updateNode(id, payload) {
    set({ loading: true });

    try {
      await processService.update(id, payload);

      const allNodes = await processService.list();
      const { nodesById, childrenByParent } = buildIndexes(allNodes);

      set((state) => ({
        nodesById,
        childrenByParent,
        loadedChildren: {
          ...state.loadedChildren,
          [ROOT_PARENT]: true,
        },
      }));
    } finally {
      set({ loading: false });
    }
  },

  async removeNode(id) {
    set({ loading: true });

    try {
      await processService.remove(id);

      const allNodes = await processService.list();
      const { nodesById, childrenByParent } = buildIndexes(allNodes);

      set((state) => ({
        nodesById,
        childrenByParent,
        loadedChildren: {
          ...state.loadedChildren,
          [ROOT_PARENT]: true,
        },
      }));
    } finally {
      set({ loading: false });
    }
  },

  async toggleStatus(id) {
    set({ loading: true });

    try {
      await processService.toggleStatus(id);

      const allNodes = await processService.list();
      const { nodesById, childrenByParent } = buildIndexes(allNodes);

      set((state) => ({
        nodesById,
        childrenByParent,
        loadedChildren: {
          ...state.loadedChildren,
          [ROOT_PARENT]: true,
        },
      }));
    } finally {
      set({ loading: false });
    }
  },

  reset() {
    set({
      nodesById: {},
      childrenByParent: {},
      loadedChildren: {},
      loading: false,
    });
  },
}));