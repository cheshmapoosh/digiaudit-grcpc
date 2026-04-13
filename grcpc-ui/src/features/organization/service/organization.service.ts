import { omitKeys } from "@/shared/utils/object.utils";
import {
    organizationCreateSchema,
    organizationUpdateSchema,
} from "@/features/organization";
import type {
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
    OrganizationReadonlyKeys,
} from "@/features/organization";
import type { OrganizationRepo } from "../infra/organization.repo";
import { createOrganizationRepo } from "../infra/organization.factory";
import { sortOrganizations } from "../utils/organization.tree";

const READONLY_KEYS: readonly OrganizationReadonlyKeys[] = [
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

export interface OrganizationService {
    list(): Promise<OrganizationNode[]>;
    getById(id: string): Promise<OrganizationNode | null>;
    create(payload: OrganizationNodeCreate): Promise<OrganizationNode>;
    update(id: string, payload: OrganizationNodeUpdate): Promise<OrganizationNode>;
    remove(id: string): Promise<void>;
    toggleStatus(id: string): Promise<OrganizationNode>;
}

export function createOrganizationService(
    repo: OrganizationRepo,
): OrganizationService {
    return {
        async list() {
            const items = await repo.list();
            return sortOrganizations(items);
        },

        async getById(id) {
            return repo.getById(id);
        },

        async create(payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = organizationCreateSchema.parse(sanitized);
            return repo.create(parsed);
        },

        async update(id, payload) {
            const sanitized = removeReadonlyFields(payload);
            const parsed = organizationUpdateSchema.parse(sanitized);
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

const organizationRepo = createOrganizationRepo();
export const organizationService = createOrganizationService(organizationRepo);