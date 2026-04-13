import { omitKeys } from "@/shared/utils/object.utils";
import {
    regulationCreateSchema,
    regulationUpdateSchema,
} from "@/features/regulation";
import type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeUpdate,
    RegulationReadonlyKeys,
} from "@/features/regulation";
import type { RegulationRepo } from "../infra/regulation.repo";
import { createRegulationRepo } from "../infra/regulation.factory";
import { sortRegulations } from "../utils/regulation.tree";

const READONLY_KEYS: readonly RegulationReadonlyKeys[] = [
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

export interface RegulationService {
    list(): Promise<RegulationNode[]>;
    getById(id: string): Promise<RegulationNode | null>;
    create(payload: RegulationNodeCreate): Promise<RegulationNode>;
    update(id: string, payload: RegulationNodeUpdate): Promise<RegulationNode>;
    remove(id: string): Promise<void>;
    toggleStatus(id: string): Promise<RegulationNode>;
}

export function createRegulationService(
    repo: RegulationRepo,
): RegulationService {
    return {
        async list() {
            const items = await repo.list();
            return sortRegulations(items);
        },

        async getById(id) {
            return repo.getById(id);
        },

        async create(payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = regulationCreateSchema.parse(sanitized);
            return repo.create(parsed);
        },

        async update(id, payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = regulationUpdateSchema.parse(sanitized);
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

const regulationRepo = createRegulationRepo();
export const regulationService = createRegulationService(regulationRepo);