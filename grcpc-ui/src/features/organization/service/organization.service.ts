import {
    organizationCreateSchema,
    organizationLifecycleSchema,
    organizationMoveSchema,
    organizationUpdateSchema,
} from "@/features/organization";
import type {
    MasterDataRevisionMutationResponse,
    OrganizationLifecycleCommand,
    OrganizationMoveCommand,
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "@/features/organization";
import type { OrganizationRepo } from "../infra/organization.repo";
import { createOrganizationRepo } from "../infra/organization.factory";
import { sortOrganizations } from "../utils/organization.tree";

function normalizeCode(value: string): string {
    return value.trim().toLocaleUpperCase("en-US");
}

function normalizeOptionalDate(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function normalizeCreatePayload(payload: OrganizationNodeCreate): OrganizationNodeCreate {
    const parsed = organizationCreateSchema.parse(payload);

    return {
        code: normalizeCode(parsed.code),
        parentOrganizationId: parsed.parentOrganizationId?.trim() || null,
        validFrom: normalizeOptionalDate(parsed.validFrom),
        validTo: normalizeOptionalDate(parsed.validTo),
    };
}

function normalizeUpdatePayload(payload: OrganizationNodeUpdate): OrganizationNodeUpdate {
    const parsed = organizationUpdateSchema.parse(payload);

    return {
        version: parsed.version,
        validFrom: normalizeOptionalDate(parsed.validFrom),
        validTo: normalizeOptionalDate(parsed.validTo),
    };
}

function normalizeMovePayload(payload: OrganizationMoveCommand): OrganizationMoveCommand {
    const parsed = organizationMoveSchema.parse(payload);

    return {
        parentOrganizationId: parsed.parentOrganizationId?.trim() || null,
        version: parsed.version,
    };
}

function normalizeLifecyclePayload(
    payload: OrganizationLifecycleCommand,
): OrganizationLifecycleCommand {
    return organizationLifecycleSchema.parse(payload);
}

export interface OrganizationService {
    list(): Promise<OrganizationNode[]>;
    getById(id: string): Promise<OrganizationNode | null>;
    create(payload: OrganizationNodeCreate): Promise<MasterDataRevisionMutationResponse>;
    update(
        id: string,
        payload: OrganizationNodeUpdate,
    ): Promise<MasterDataRevisionMutationResponse>;
    move(
        id: string,
        payload: OrganizationMoveCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    activate(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    inactivate(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    delete(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    restore(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
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
            return repo.create(normalizeCreatePayload(payload));
        },

        async update(id, payload) {
            return repo.update(id, normalizeUpdatePayload(payload));
        },

        async move(id, payload) {
            return repo.move(id, normalizeMovePayload(payload));
        },

        async activate(id, payload) {
            return repo.activate(id, normalizeLifecyclePayload(payload));
        },

        async inactivate(id, payload) {
            return repo.inactivate(id, normalizeLifecyclePayload(payload));
        },

        async delete(id, payload) {
            return repo.delete(id, normalizeLifecyclePayload(payload));
        },

        async restore(id, payload) {
            return repo.restore(id, normalizeLifecyclePayload(payload));
        },
    };
}

const organizationRepo = createOrganizationRepo();
export const organizationService = createOrganizationService(organizationRepo);
