import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlexBox, Link, MessageStrip, Text } from "@ui5/webcomponents-react";
import { CatalogRelationTable } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import type { ProcessNode } from "@/features/process";
import type { LocalContextDraft, LocalContextRow, LocalStatus } from "../domain/local.model";
import { localApi } from "../infra/local.api.repo";
import OrganizationSubprocessSearchDialog from "./OrganizationSubprocessSearchDialog";
import "./organizationSubprocessTable.css";

interface Props {
    organizationId: string | null;
    editable: boolean;
    busy: boolean;
    canonicalRows?: LocalContextRow[];
    resetKey?: string | number;
    changes: LocalContextDraft[];
    onChange: (changes: LocalContextDraft[]) => void;
    onPendingChange: (pending: boolean) => void;
    onReadyChange: (ready: boolean) => void;
}

/** Relationship drafts belong to the Organization modal; this table never writes or owns an edit mode. */
export default function OrganizationSubprocessTable({ organizationId, editable, busy, canonicalRows, resetKey,
    changes, onChange, onPendingChange, onReadyChange }: Props) {
    const { t } = useTranslation();
    const [loaded, setLoaded] = useState<LocalContextRow[]>([]);
    const [loadedFor, setLoadedFor] = useState<string | null>(organizationId);
    const previousOwner = useRef(organizationId);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [pickerOpen, setPickerOpen] = useState(false);
    const [loading, setLoading] = useState(Boolean(organizationId));
    const [error, setError] = useState<string | null>(null);
    const [retry, setRetry] = useState(0);
    const [statusFilter, setStatusFilter] = useState<CatalogRelationFilter>("ALL");
    const [search, setSearch] = useState("");
    useEffect(() => { onPendingChange(pickerOpen); }, [pickerOpen, onPendingChange]);
    useEffect(() => { onReadyChange(!loading && !error && !pickerOpen); }, [loading, error, pickerOpen, onReadyChange]);
    useEffect(() => {
        let current = true;
        void Promise.resolve().then(() => { if (current) setLoading(Boolean(organizationId)); });
        const request = organizationId ? localApi.allContexts(organizationId) : Promise.resolve([]);
        void request.then((result) => {
            if (current) {
                setLoaded(result); setLoadedFor(organizationId); setLoading(false); setError(null);
                if (previousOwner.current !== organizationId) setSelected(new Set());
                previousOwner.current = organizationId;
            }
        }).catch(() => {
            if (current) { setLoading(false); setError(t("local.subprocessTable.loadError")); }
        });
        return () => { current = false; };
    }, [organizationId, resetKey, retry, t]);

    const rows = useMemo(() => {
        const merged = new Map<string, LocalContextRow>();
        for (const row of [...(loadedFor === organizationId ? loaded : []), ...(canonicalRows ?? [])]) {
            const previous = merged.get(row.subprocessId);
            if (!previous || previous.version <= row.version) merged.set(row.subprocessId, row);
        }
        return [...merged.values()];
    }, [canonicalRows, loaded, loadedFor, organizationId]);
    const byId = useMemo(() => new Map(rows.map((row) => [row.subprocessId, row])), [rows]);
    const byChange = new Map(changes.map((change) => [change.subprocessId, change]));
    const target = (change: LocalContextDraft | undefined, original?: LocalContextRow): LocalStatus =>
        change?.operation === "DELETE" ? "DELETED" : change?.operation === "INACTIVATE" ? "INACTIVE"
            : change ? "ACTIVE" : original?.status ?? "ACTIVE";
    const currentRows = [
        ...rows.map((original) => ({ subprocessId: original.subprocessId, code: original.subprocessCode,
            name: original.subprocessLabel, original, change: byChange.get(original.subprocessId) })),
        ...changes.filter((change) => !byId.has(change.subprocessId)).map((change) => ({ subprocessId: change.subprocessId,
            code: change.code, name: change.name, original: undefined, change })),
    ].filter(item => item.change || item.original?.status !== "DELETED");
    const needle = search.trim().toLocaleLowerCase("fa");
    const displayed = currentRows.filter(item => (item.change || statusFilter === "ALL" || item.original?.status === statusFilter)
        && (!needle || `${item.code} ${item.name}`.toLocaleLowerCase("fa").includes(needle)));
    const checked = currentRows.filter((row) => selected.has(row.subprocessId));
    const affected = (status: LocalStatus) => checked.filter((item) => target(item.change, item.original) !== status
        && (status === "DELETED" || (item.original && item.original.status !== "DELETED")));
    const excludedIds = new Set([
        ...rows.filter((row) => target(byChange.get(row.subprocessId), row) !== "DELETED").map((row) => row.subprocessId),
        ...changes.filter((row) => row.operation !== "DELETE").map((row) => row.subprocessId),
    ]);

    const stage = (items: ProcessNode[]) => {
        if (!editable || busy) return;
        let next = [...changes];
        for (const node of items) {
            const staged = next.find((row) => row.subprocessId === node.id);
            if (staged && staged.operation !== "DELETE") continue;
            const original = byId.get(node.id);
            if (original && original.status !== "DELETED") {
                if (staged?.operation === "DELETE") next = next.filter((row) => row.subprocessId !== node.id);
                continue;
            }
            next.push({ subprocessId: node.id, code: node.code, name: node.title, operation: "CREATE_OR_RESTORE",
                ...(original ? { contextId: original.id, version: original.version } : {}) });
        }
        onChange(next);
        setPickerOpen(false);
    };
    const changeStatus = (status: LocalStatus) => {
        if (!editable || busy) return;
        const affectedRows = affected(status);
        const affectedIds = new Set(affectedRows.map((item) => item.subprocessId));
        const next = changes.filter((change) => !affectedIds.has(change.subprocessId));
        for (const item of affectedRows) {
            const original = item.original;
            if (!original || original.status === "DELETED") {
                if (status !== "DELETED" && item.change) next.push(item.change);
                continue;
            }
            if (original.status === status) continue;
            const operation = status === "DELETED" ? "DELETE" : status === "INACTIVE" ? "INACTIVATE" : "ACTIVATE";
            next.push({ subprocessId: original.subprocessId, code: original.subprocessCode, name: original.subprocessLabel,
                contextId: original.id, version: original.version, operation });
        }
        onChange(next);
    };
    return <FlexBox direction="Column" className="organizationSubprocessTable">
        <CatalogRelationToolbar title={t("local.subprocessSearch.section")} search={search} onSearch={setSearch}
            filter={statusFilter} onFilter={setStatusFilter} editable={editable} busy={busy}
            canSelect={!loading && !error} canActivate={!loading && affected("ACTIVE").length > 0}
            canInactivate={!loading && affected("INACTIVE").length > 0} canDelete={!loading && affected("DELETED").length > 0}
            onSelect={() => setPickerOpen(true)} onActivate={() => changeStatus("ACTIVE")}
            onInactivate={() => changeStatus("INACTIVE")} onDelete={() => changeStatus("DELETED")} />
        {error ? <><MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip>
            <Link onClick={() => setRetry(value => value + 1)}>{t("catalogRelation.retry")}</Link></> : null}
        {changes.length ? <MessageStrip design="Information" hideCloseButton>{t("local.subprocessTable.draftHint")}</MessageStrip> : null}
        <CatalogRelationTable rows={displayed} rowKey={item => item.subprocessId} accessibleName={t("local.subprocessSearch.section")}
            selectedKeys={selected} onSelectionChange={setSelected} selectable={editable} loading={loading} busy={busy}
            emptyText={t("local.subprocessTable.empty")} columns={[
                { key: "code", header: t("catalogRelation.code"), cell: item => <Text>{item.code}</Text> },
                { key: "name", header: t("catalogRelation.name"), cell: item => <Text>{item.name}</Text> },
                { key: "status", header: t("catalogRelation.status"), cell: item => <CatalogRelationStatus status={target(item.change, item.original)}
                    draft={item.change?.operation === "DELETE" ? "delete" : item.change?.operation === "ACTIVATE" ? "active"
                        : item.change?.operation === "INACTIVATE" ? "inactive" : item.change ? "new" : null} /> },
            ]} />
        {pickerOpen ? <OrganizationSubprocessSearchDialog excludedIds={excludedIds} onClose={() => setPickerOpen(false)}
            busy={busy} onSelected={stage} /> : null}
    </FlexBox>;
}
