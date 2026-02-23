// src/features/regulation/service/regulation.service.ts
import type {
    RegulationEntity,
    RegulationId,
    RegulationUpsertInput,
} from "../model/regulation.types";
import { regulationRepo } from "./regulation.repo.provider";
import { ensureArray } from "../../../utils/array.utils";

function nowIso() {
    return new Date().toISOString();
}

function uuid() {
    if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
        return (crypto as any).randomUUID();
    }
    return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * اگر در مدل Regulation فیلدهای depth/path ندارید، این توابع عملاً فقط order/status/... را مدیریت می‌کنند.
 * اگر دارید، با best-effort محاسبه می‌کنیم و در update/create ست می‌کنیم (به شرط وجود در input/entity).
 */

type AnyObj = Record<string, any>;

function hasProp<T extends object>(obj: T, key: string): boolean {
    return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

function nextOrder(nodes: RegulationEntity[], parentId: string | null): number {
    const siblings = nodes.filter((n) => (n.parentId ?? null) === parentId);
    const max = siblings.reduce((m, n) => Math.max(m, (n as AnyObj).order ?? 0), -1);
    return max + 1;
}

function buildById(nodes: RegulationEntity[]): Record<string, RegulationEntity> {
    return Object.fromEntries(nodes.map((n) => [n.id, n]));
}

function isDescendant(byId: Record<string, RegulationEntity>, ancestorId: string, maybeDescId: string): boolean {
    // بالا رفتن از parentها تا ریشه
    let cur: RegulationEntity | undefined = byId[maybeDescId];
    while (cur) {
        const p = cur.parentId ?? null;
        if (!p) return false;
        if (p === ancestorId) return true;
        cur = byId[p];
    }
    return false;
}

function computeDepthAndPath(
    byId: Record<string, RegulationEntity>,
    node: RegulationEntity
): { depth?: number; path?: string } {
    // depth/path را فقط اگر به نظر برسد که مدل‌تان از آن‌ها استفاده می‌کند برمی‌گردانیم
    // (یعنی در entity فعلی وجود داشته باشند)
    const wantsDepth = hasProp(node as AnyObj, "depth");
    const wantsPath = hasProp(node as AnyObj, "path");

    if (!wantsDepth && !wantsPath) return {};

    const parts: string[] = [];
    let depth = 0;

    let cur: RegulationEntity | undefined = node;
    while (cur) {
        parts.push(cur.id);
        const pid = cur.parentId ?? null;
        if (!pid) break;
        depth += 1;
        cur = byId[pid];
    }

    parts.reverse();
    const path = parts.join("/");

    const out: { depth?: number; path?: string } = {};
    if (wantsDepth) out.depth = depth;
    if (wantsPath) out.path = path;
    return out;
}

function toUpsertInput(entity: RegulationEntity): RegulationUpsertInput {
    // این تابع باید با مدل واقعی‌ات match باشد.
    // اگر RegulationUpsertInput فیلدهای بیشتری دارد (order/depth/path/...) اینجا اضافه کن.
    const e: AnyObj = entity as AnyObj;

    const input: AnyObj = {
        code: entity.code,
        title: entity.title,
        description: entity.description,
        parentId: entity.parentId ?? null,
        status: (entity as AnyObj).status,
    };

    // اگر order در UpsertInput وجود دارد، پاس بده
    if (hasProp(input, "order") || hasProp(e, "order")) input.order = e.order;

    // اگر depth/path در UpsertInput وجود دارد، پاس بده
    if (hasProp(e, "depth")) input.depth = e.depth;
    if (hasProp(e, "path")) input.path = e.path;

    return input as RegulationUpsertInput;
}

export interface RegulationService {
    list(): Promise<RegulationEntity[]>;
    getChildren(parentId: string | null): Promise<RegulationEntity[]>;
    getById(id: RegulationId): Promise<RegulationEntity | null>;

    create(input: {
        parentId: string | null;
        title: string;
        code: string;
        description?: string;
        status: RegulationEntity["status"];
    }): Promise<RegulationEntity>;

    update(id: RegulationId, patch: Partial<Omit<RegulationEntity, "id">>): Promise<RegulationEntity>;

    move(id: RegulationId, payload: { newParentId: string | null; newOrder?: number }): Promise<RegulationEntity>;

    toggleStatus(id: RegulationId): Promise<RegulationEntity>;

    delete(id: RegulationId, opts?: { cascade?: boolean }): Promise<void>;
}

export const regulationService: RegulationService = {
    async list() {
        const items = ensureArray<RegulationEntity>(await regulationRepo.list());
        // اگر order دارید sort کنید، اگر ندارید ترتیب فعلی را نگه می‌داریم
        const hasOrder = items.some((x) => hasProp(x as AnyObj, "order"));
        return hasOrder ? [...items].sort((a, b) => ((a as AnyObj).order ?? 0) - ((b as AnyObj).order ?? 0)) : items;
    },

    async getChildren(parentId) {
        const items = ensureArray<RegulationEntity>(await regulationRepo.list());
        const children = items.filter((n) => (n.parentId ?? null) === parentId);
        const hasOrder = children.some((x) => hasProp(x as AnyObj, "order"));
        return hasOrder
            ? [...children].sort((a, b) => ((a as AnyObj).order ?? 0) - ((b as AnyObj).order ?? 0))
            : children;
    },

    async getById(id) {
        return regulationRepo.getById(id);
    },

    async create(input) {
        try {
            const items = ensureArray<RegulationEntity>(await regulationRepo.list());

            const base: AnyObj = {
                id: uuid(),
                parentId: input.parentId ?? null,
                title: input.title,
                code: input.code,
                description: input.description,
                status: input.status ?? "ACTIVE",
                createdAt: nowIso(),
                updatedAt: nowIso(),
            };

            // اگر order در مدل‌تان هست، ست کنیم
            base.order = nextOrder(items, input.parentId ?? null);

            // اگر depth/path در مدل هست و expected است، محاسبه کنیم
            const byId = buildById(items);
            const tmpEntity: RegulationEntity = base as RegulationEntity;
            const dp = computeDepthAndPath(byId, tmpEntity);
            if (dp.depth != null) base.depth = dp.depth;
            if (dp.path != null) base.path = dp.path;

            // RegulationUpsertInput معمولاً id/createdAt/updatedAt ندارد، پس برای create باید فقط input را بدهیم.
            // اما چون repo.create(input) است، یک input صحیح می‌سازیم:
            const upsert: AnyObj = {
                code: base.code,
                title: base.title,
                description: base.description,
                parentId: base.parentId,
                status: base.status,
            };

            // اگر repo/back مدل شما order/depth/path را هم در upsert می‌پذیرد، پاس بده
            if ("order" in base) upsert.order = base.order;
            if ("depth" in base) upsert.depth = base.depth;
            if ("path" in base) upsert.path = base.path;

            // اگر در storageRepo شما createdAt/updatedAt را در create خودش ست می‌کند، این‌ها نادیده گرفته می‌شوند.
            const created = await regulationRepo.create(upsert as RegulationUpsertInput);
            return created;
        } catch (e) {
            console.error("[regulationService.create] failed", { input, error: e });
            throw e;
        }
    },

    async update(id, patch) {
        const current = await regulationRepo.getById(id);
        if (!current) throw new Error("Node not found");

        const merged: RegulationEntity = {
            ...current,
            ...(patch as AnyObj),
            id,
            updatedAt: nowIso(),
        };

        // اگر parentId تغییر کرده و depth/path دارید، بعداً در move پوشش داده می‌شود؛ اینجا هم best-effort:
        const items = ensureArray<RegulationEntity>(await regulationRepo.list());
        const byId = buildById(items);
        const dp = computeDepthAndPath(byId, merged);
        const mergedAny: AnyObj = merged as AnyObj;
        if (dp.depth != null) mergedAny.depth = dp.depth;
        if (dp.path != null) mergedAny.path = dp.path;

        const input = toUpsertInput(mergedAny as RegulationEntity);
        const updated = await regulationRepo.update(id, input);
        return updated;
    },

    async move(id, payload) {
        const items = ensureArray<RegulationEntity>(await regulationRepo.list());
        const byId = buildById(items);
        const node = byId[id];
        if (!node) throw new Error("Node not found");

        const newParentId = payload.newParentId ?? null;
        if (newParentId === id) throw new Error("Parent cannot be the node itself");

        if (newParentId && isDescendant(byId, id, newParentId)) {
            throw new Error("Cannot move a node under its own descendant");
        }

        const newOrder =
            payload.newOrder != null
                ? payload.newOrder
                : nextOrder(items.filter((n) => n.id !== id), newParentId);

        const moved: RegulationEntity = {
            ...node,
            parentId: newParentId,
            ...(hasProp(node as AnyObj, "order") ? ({ order: newOrder } as AnyObj) : {}),
            updatedAt: nowIso(),
        } as RegulationEntity;

        // update نود اصلی
        const movedDp = computeDepthAndPath(byId, moved);
        const movedAny: AnyObj = moved as AnyObj;
        if (movedDp.depth != null) movedAny.depth = movedDp.depth;
        if (movedDp.path != null) movedAny.path = movedDp.path;

        const updatedNode = await regulationRepo.update(id, toUpsertInput(movedAny));

        // اگر depth/path ندارید همین کافی است
        const wantsDepthOrPath = hasProp(updatedNode as AnyObj, "depth") || hasProp(updatedNode as AnyObj, "path");
        if (!wantsDepthOrPath) return updatedNode;

        // اگر depth/path دارید: کل subtree باید recompute شود و با update تک‌تک ذخیره شود
        // subtree: همه نودهایی که در مسیر والدشان به id می‌رسد
        const latestItems = ensureArray<RegulationEntity>(await regulationRepo.list());
        const latestById = buildById(latestItems);

        // پیدا کردن اعضای subtree
        const subtreeIds = new Set<string>();
        const stack = [id];
        while (stack.length) {
            const cur = stack.pop()!;
            if (subtreeIds.has(cur)) continue;
            subtreeIds.add(cur);
            for (const n of latestItems) {
                if ((n.parentId ?? null) === cur) stack.push(n.id);
            }
        }

        // recompute depth/path برای subtree (به ترتیب BFS از والد به فرزند بهتره)
        // ساده: چند پاس با stack از ریشه subtree
        const queue = [id];
        while (queue.length) {
            const curId = queue.shift()!;
            const curNode = latestById[curId];
            if (!curNode) continue;

            const dp = computeDepthAndPath(latestById, curNode);
            const curAny: AnyObj = { ...curNode };
            if (dp.depth != null) curAny.depth = dp.depth;
            if (dp.path != null) curAny.path = dp.path;

            // فقط اگر واقعاً تغییر کرد update بزن
            const needUpdate =
                (dp.depth != null && curAny.depth !== (curNode as AnyObj).depth) ||
                (dp.path != null && curAny.path !== (curNode as AnyObj).path);

            if (needUpdate) {
                const saved = await regulationRepo.update(curId, toUpsertInput(curAny as RegulationEntity));
                latestById[curId] = saved; // برای محاسبه فرزندان
            }

            // enqueue children
            for (const n of latestItems) {
                if ((n.parentId ?? null) === curId && subtreeIds.has(n.id)) {
                    queue.push(n.id);
                }
            }
        }

        // خروجی نهایی همان updatedNode است (یا دوباره getById)
        return (await regulationRepo.getById(id)) ?? updatedNode;
    },

    async toggleStatus(id) {
        const node = await regulationRepo.getById(id);
        if (!node) throw new Error("Node not found");

        const nextStatus = (node as AnyObj).status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const nextEntity: RegulationEntity = { ...node, status: nextStatus, updatedAt: nowIso() } as RegulationEntity;

        return regulationRepo.update(id, toUpsertInput(nextEntity));
    },

    async delete(id, opts) {
        const items = ensureArray<RegulationEntity>(await regulationRepo.list());
        const byId = buildById(items);
        if (!byId[id]) return;

        const cascade = opts?.cascade ?? false;

        if (!cascade) {
            const hasChild = items.some((n) => (n.parentId ?? null) === id);
            if (hasChild) throw new Error("Node has children. Use cascade delete.");
            await regulationRepo.delete(id);
            return;
        }

        // cascade delete: delete subtree
        const toDelete = new Set<string>();
        const stack = [id];

        while (stack.length) {
            const cur = stack.pop()!;
            if (toDelete.has(cur)) continue;
            toDelete.add(cur);

            for (const n of items) {
                if ((n.parentId ?? null) === cur) stack.push(n.id);
            }
        }

        // حذف فرزندان اول یا ترتیب مهم نیست برای storage؛ اینجا از برگ به ریشه حذف می‌کنیم
        // برای اینکار depth تقریبی: هرچه path طولانی‌تر یا chain طولانی‌تر => اولویت حذف
        const deleteList = Array.from(toDelete);
        deleteList.sort((a, b) => {
            // عمق تخمینی با parent chain
            const depthOf = (x: string) => {
                let d = 0;
                let cur = byId[x];
                while (cur?.parentId) {
                    d += 1;
                    cur = byId[cur.parentId];
                }
                return d;
            };
            return depthOf(b) - depthOf(a);
        });

        for (const delId of deleteList) {
            await regulationRepo.delete(delId);
        }
    },
};