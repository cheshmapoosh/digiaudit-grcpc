// src/features/process/service/process.storage.ts
import type { ProcessNode } from "../model/process.types";

const STORAGE_KEY = "grc.process.nodes.v1";

type StorageShape = {
    version: 1;
    nodes: ProcessNode[];
};

function safeParse(json: string | null): StorageShape | null {
    if (!json) return null;
    try {
        return JSON.parse(json) as StorageShape;
    } catch {
        return null;
    }
}

export const processStorage = {
    load(): ProcessNode[] {
        const raw = safeParse(localStorage.getItem(STORAGE_KEY));
        if (!raw || raw.version !== 1 || !Array.isArray(raw.nodes)) return [];
        return raw.nodes;
    },

    save(nodes: ProcessNode[]) {
        const payload: StorageShape = { version: 1, nodes };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },

    clear() {
        localStorage.removeItem(STORAGE_KEY);
    },
};
