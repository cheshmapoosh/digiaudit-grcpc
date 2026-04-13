import { createId } from "@/shared/utils/id.utils";
import type {
  ProcessNode,
  ProcessNodeCreate,
  ProcessNodeUpdate,
} from "@/features/process";
import type { ProcessRepo } from "./process.repo";

const STORAGE_KEY = "grc:processes";

function readStorage(): ProcessNode[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as ProcessNode[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(items: ProcessNode[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function nowIso(): string {
  return new Date().toISOString();
}

export class ProcessStorageRepo implements ProcessRepo {
  async list(): Promise<ProcessNode[]> {
    return readStorage();
  }

  async getById(id: string): Promise<ProcessNode | null> {
    const items = readStorage();
    return items.find((item) => item.id === id) ?? null;
  }

  async create(payload: ProcessNodeCreate): Promise<ProcessNode> {
    const items = readStorage();

    const entity: ProcessNode = {
      id: createId("proc"),
      code: payload.code,
      title: payload.title,
      description: payload.description,
      parentId: payload.parentId ?? null,
      ownerId: payload.ownerId ?? null,
      sortOrder: payload.sortOrder,
      status: payload.status,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: "local-user",
      updatedBy: "local-user",
      deletedAt: null,
      deletedBy: null,
    };

    items.push(entity);
    writeStorage(items);

    return entity;
  }

  async update(id: string, payload: ProcessNodeUpdate): Promise<ProcessNode> {
    const items = readStorage();
    const index = items.findIndex((item) => item.id === id);

    if (index < 0) {
      throw new Error("NOT_FOUND");
    }

    const current = items[index];

    const updated: ProcessNode = {
      ...current,
      ...payload,
      updatedAt: nowIso(),
      updatedBy: "local-user",
    };

    items[index] = updated;
    writeStorage(items);

    return updated;
  }

  async remove(id: string): Promise<void> {
    const items = readStorage();

    const hasChildren = items.some((item) => item.parentId === id);
    if (hasChildren) {
      throw new Error("HAS_CHILDREN");
    }

    const next = items.filter((item) => item.id !== id);

    if (next.length === items.length) {
      throw new Error("NOT_FOUND");
    }

    writeStorage(next);
  }

  async getChildren(parentId: string | null = null): Promise<ProcessNode[]> {
    const items = readStorage();
    return items.filter((item) => (item.parentId ?? null) === parentId);
  }

  /**
   * تغییر وضعیت بین "active" و "inactive"
   */
  async toggleStatus(id: string): Promise<ProcessNode> {
    const items = readStorage();
    const index = items.findIndex((item) => item.id === id);

    if (index < 0) {
      throw new Error("NOT_FOUND");
    }

    const current = items[index];
    const updated: ProcessNode = {
      ...current,
      status: current.status === "active" ? "inactive" : "active",
      updatedAt: nowIso(),
      updatedBy: "local-user",
    };

    items[index] = updated;
    writeStorage(items);

    return updated;
  }
}
