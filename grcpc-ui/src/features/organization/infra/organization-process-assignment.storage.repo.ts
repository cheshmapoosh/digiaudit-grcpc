import { createId } from "@/shared/utils/id.utils";
import type {
    OrganizationProcessAssignment,
    OrganizationProcessAssignmentCreate,
} from "../domain/organization-process-assignment.model";
import type { OrganizationProcessAssignmentRepo } from "./organization-process-assignment.repo";

const STORAGE_KEY = "grc:organization-process-assignments";
const LOCAL_USER = "local-user";

function nowIso(): string {
    return new Date().toISOString();
}

function readStorage(): OrganizationProcessAssignment[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as OrganizationProcessAssignment[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStorage(items: OrganizationProcessAssignment[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function buildCreatedEntity(
    payload: OrganizationProcessAssignmentCreate,
): OrganizationProcessAssignment {
    const now = nowIso();

    return {
        id: createId("org-proc"),
        organizationId: payload.organizationId,
        processNodeId: payload.processNodeId,
        assignmentType: payload.assignmentType ?? "scope",
        validFrom: payload.validFrom,
        validTo: payload.validTo,
        isActive: payload.isActive ?? true,
        createdAt: now,
        updatedAt: now,
        createdBy: LOCAL_USER,
        updatedBy: LOCAL_USER,
        deletedAt: null,
        deletedBy: null,
    };
}

export class OrganizationProcessAssignmentStorageRepo
    implements OrganizationProcessAssignmentRepo
{
    async list(): Promise<OrganizationProcessAssignment[]> {
        return readStorage();
    }

    async listByOrganization(organizationId: string): Promise<OrganizationProcessAssignment[]> {
        return readStorage().filter((item) => item.organizationId === organizationId);
    }

    async create(
        payload: OrganizationProcessAssignmentCreate,
    ): Promise<OrganizationProcessAssignment> {
        const items = readStorage();
        const existing = items.find(
            (item) =>
                item.organizationId === payload.organizationId &&
                item.processNodeId === payload.processNodeId,
        );

        if (existing) {
            return existing;
        }

        const entity = buildCreatedEntity(payload);
        writeStorage([...items, entity]);

        return entity;
    }

    async remove(id: string): Promise<void> {
        const items = readStorage();
        writeStorage(items.filter((item) => item.id !== id));
    }
}

export const organizationProcessAssignmentStorageRepo =
    new OrganizationProcessAssignmentStorageRepo();
