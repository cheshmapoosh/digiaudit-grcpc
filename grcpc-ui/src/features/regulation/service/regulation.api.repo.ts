import type {
    PagedResult,
    RegulationEntity,
    RegulationId,
    RegulationListQuery,
    RegulationUpsertInput,
} from "../model/regulation.types";
import type { RegulationRepo } from "./regulation.repo";

// این را با http client خودت مچ کن (fetch/axios/ky/…)
async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const res = await fetch(input, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
    }
    return (await res.json()) as T;
}


export const regulationApiRepo: RegulationRepo = {
    list(query: RegulationListQuery): Promise<PagedResult<RegulationEntity>> {
        const usp = new URLSearchParams();
        if (query.search) usp.set("search", query.search);
        if (query.status) usp.set("status", query.status);
        if (query.page != null) usp.set("page", String(query.page));
        if (query.size != null) usp.set("size", String(query.size));
        return http(`${this.baseUrl}/regulations?${usp.toString()}`);
    },

    getById(id: RegulationId): Promise<RegulationEntity> {
        return http(`${this.baseUrl}/regulations/${id}`);
    },

    create(input: RegulationUpsertInput): Promise<RegulationEntity> {
        return http(`${this.baseUrl}/regulations`, { method: "POST", body: JSON.stringify(input) });
    },

    update(id: RegulationId, input: RegulationUpsertInput): Promise<RegulationEntity> {
        return http(`${this.baseUrl}/regulations/${id}`, { method: "PUT", body: JSON.stringify(input) });
    },

    delete(id: RegulationId): Promise<void> {
        return http(`${this.baseUrl}/regulations/${id}`, { method: "DELETE" });
    },

    listAllForTree(): Promise<RegulationEntity[]> {
        return http(`${this.baseUrl}/regulations/tree-items`);
    },
}