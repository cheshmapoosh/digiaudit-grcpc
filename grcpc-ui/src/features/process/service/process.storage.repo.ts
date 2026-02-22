import type { ProcessNode } from "../model/process.types";
import type { ProcessRepo } from "./process.repo";

const STORAGE_KEY = "grc.process.nodes.v1";

type StorageShape = {
    version: 1;
    nodes: ProcessNode[];
};

function parse(json: string | null): any {
    if (!json) return null;
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function normalizeToNodesArray(raw: any): ProcessNode[] {
    // expected shape: { version: 1, nodes: [...] }
    if (raw && Array.isArray(raw.nodes)) return raw.nodes as ProcessNode[];

    // legacy shape: nodes array saved directly
    if (Array.isArray(raw)) return raw as ProcessNode[];

    return [];
}

export const processStorageRepo: ProcessRepo = {
    async listAll(): Promise<ProcessNode[]> {
        const raw = parse(localStorage.getItem(STORAGE_KEY));
        return normalizeToNodesArray(raw);
    },

    async saveAll(nodes: ProcessNode[]): Promise<void> {
        const payload: StorageShape = { version: 1, nodes };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },
};

export function clearProcessStorage() {
    localStorage.removeItem(STORAGE_KEY);
}