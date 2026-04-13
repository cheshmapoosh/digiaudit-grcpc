import { omitKeys } from "@/shared/utils/object.utils";
import {
  processCreateSchema,
  processUpdateSchema,
} from "@/features/process";
import type {
  ProcessNode,
  ProcessNodeCreate,
  ProcessNodeUpdate,
  ProcessReadonlyKeys,
} from "@/features/process";
import type { ProcessRepo } from "../infra/process.repo";
import { createProcessRepo } from "../infra/process.factory";
import { buildTree, sortProcesses } from "../utils/process.tree";

const READONLY_KEYS: readonly ProcessReadonlyKeys[] = [
  "id",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "deletedAt",
  "deletedBy",
] as const;

function removeReadonlyFields<T extends Record<string, unknown>>(payload: T) {
  return omitKeys(payload, READONLY_KEYS as (keyof T)[]);
}

export type ProcessTreeNode = ReturnType<typeof buildTree>[number];

export interface ProcessService {
  list(): Promise<ProcessNode[]>;
  listTree(): Promise<ProcessTreeNode[]>;
  getById(id: string): Promise<ProcessNode | null>;
  create(payload: ProcessNodeCreate): Promise<ProcessNode>;
  update(id: string, payload: ProcessNodeUpdate): Promise<ProcessNode>;
  remove(id: string): Promise<void>;
  toggleStatus(id: string): Promise<ProcessNode>;
}

export function createProcessService(repo: ProcessRepo): ProcessService {
  return {
    async list() {
      const items = await repo.list();
      return sortProcesses(items);
    },

    async listTree() {
      const items = await repo.list();
      return buildTree(sortProcesses(items));
    },

    async getById(id: string) {
      return repo.getById(id);
    },

    async create(payload) {
      const sanitized = removeReadonlyFields(payload);
      const parsed = processCreateSchema.parse(sanitized);
      return repo.create(parsed);
    },

    async update(id, payload) {
      const sanitized = removeReadonlyFields(payload);
      const parsed = processUpdateSchema.parse(sanitized);
      return repo.update(id, parsed);
    },

    async remove(id) {
      await repo.remove(id);
    },

    async toggleStatus(id) {
      if (typeof repo.toggleStatus === "function") {
        return repo.toggleStatus(id);
      }

      const current = await repo.getById(id);
      if (!current) {
        throw new Error("NOT_FOUND");
      }

      return repo.update(id, {
        status: current.status === "active" ? "inactive" : "active",
      });
    },
  };
}

const processRepo = createProcessRepo();
export const processService = createProcessService(processRepo);