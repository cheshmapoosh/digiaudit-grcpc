import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlexBox, MessageStrip, ObjectStatus, Option, Select, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, TableSelectionMulti, Text, Title } from "@ui5/webcomponents-react";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import type { ProcessNode } from "@/features/process";
import type { LocalContextDraft, LocalContextRow, LocalStatus } from "../domain/local.model";
import { localApi } from "../infra/local.api.repo";
import { useOrganizationTableViewport } from "../hooks/useOrganizationTableViewport";
import OrganizationSubprocessSearchDialog from "./OrganizationSubprocessSearchDialog";
import "./organizationSubprocessTable.css";

interface Props {
    organizationId: string | null;
    editable: boolean;
    busy: boolean;
    changes: LocalContextDraft[];
    onChange: (changes: LocalContextDraft[]) => void;
    onPendingChange: (pending: boolean) => void;
    onReadyChange: (ready: boolean) => void;
}

/** Relationship drafts belong to the Organization modal; this table never writes or owns an edit mode. */
export default function OrganizationSubprocessTable({ organizationId, editable, busy, changes, onChange, onPendingChange, onReadyChange }: Props) {
    const { t } = useTranslation();
    const viewportRef = useOrganizationTableViewport();
    const [rows, setRows] = useState<LocalContextRow[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [pickerOpen, setPickerOpen] = useState(false);
    const [loading, setLoading] = useState(Boolean(organizationId));
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "">("");
    useEffect(() => { onPendingChange(pickerOpen); }, [pickerOpen, onPendingChange]);
    useEffect(() => { onReadyChange(!loading && !error && !pickerOpen); }, [loading, error, pickerOpen, onReadyChange]);
    useEffect(() => {
        let current = true;
        const request = organizationId ? localApi.allContexts(organizationId) : Promise.resolve([]);
        void request.then((result) => {
            if (current) { setRows(result); setLoading(false); setError(null); }
        }).catch(() => {
            if (current) { setLoading(false); setError(t("local.subprocessTable.loadError")); }
        });
        return () => { current = false; };
    }, [organizationId, t]);

    const byId = useMemo(() => new Map(rows.map((row) => [row.subprocessId, row])), [rows]);
    const byChange = new Map(changes.map((change) => [change.subprocessId, change]));
    const target = (change: LocalContextDraft | undefined, original?: LocalContextRow): LocalStatus =>
        change?.operation === "DELETE" ? "DELETED" : change?.operation === "INACTIVATE" ? "INACTIVE"
            : change ? "ACTIVE" : original?.status ?? "ACTIVE";
    const displayed = [
        ...rows.map((original) => ({ subprocessId: original.subprocessId, code: original.subprocessCode,
            name: original.subprocessLabel, original, change: byChange.get(original.subprocessId) })),
        ...changes.filter((change) => !byId.has(change.subprocessId)).map((change) => ({ subprocessId: change.subprocessId,
            code: change.code, name: change.name, original: undefined, change })),
    ].filter((item) => item.change || (item.original?.status !== "DELETED"
        && (!statusFilter || item.original?.status === statusFilter)));
    const checked = displayed.filter((row) => selected.has(row.subprocessId));
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
                // Re-selecting a pending deletion simply cancels that draft deletion.
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
        setSelected(new Set());
    };
    return <FlexBox direction="Column" className="organizationSubprocessTable">
        <FlexBox justifyContent="SpaceBetween" alignItems="Center" wrap="Wrap" className="organizationSubprocessActions">
            <Title level="H5">{t("local.subprocessSearch.section")}</Title>
            {editable ? <FlexBox wrap="Wrap" className="organizationSubprocessActions">
                <Button design="Emphasized" disabled={loading || busy || Boolean(error)} onClick={() => setPickerOpen(true)}>{t("common.select")}</Button>
                <Button disabled={loading || busy || !affected("ACTIVE").length}
                    onClick={() => changeStatus("ACTIVE")}>{t("local.lifecycle.activate")}</Button>
                <Button disabled={loading || busy || !affected("INACTIVE").length}
                    onClick={() => changeStatus("INACTIVE")}>{t("local.lifecycle.inactivate")}</Button>
                <Button design="Negative" disabled={loading || busy || !affected("DELETED").length}
                    onClick={() => changeStatus("DELETED")}>{t("common.delete")}</Button>
            </FlexBox> : null}
        </FlexBox>
        {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
        {changes.length ? <MessageStrip design="Information" hideCloseButton>{t("local.subprocessTable.draftHint")}</MessageStrip> : null}
        <FlexBox alignItems="Center" className="organizationSubprocessActions">
            <Title level="H6">{t("local.statusFilter")}</Title>
            <Select value={statusFilter} accessibleName={t("local.statusFilter")} disabled={busy}
                onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setSelected(new Set()); }}>
                <Option value="" selected={!statusFilter}>{t("local.subprocessTable.noStatusFilter")}</Option>
                <Option value="ACTIVE" selected={statusFilter === "ACTIVE"}>{t("local.status.ACTIVE")}</Option>
                <Option value="INACTIVE" selected={statusFilter === "INACTIVE"}>{t("local.status.INACTIVE")}</Option>
            </Select>
        </FlexBox>
        <FlexBox ref={viewportRef} direction="Column" className="organizationSubprocessViewport" role="region" aria-label={t("local.subprocessSearch.section")} tabIndex={0}>
        <Table overflowMode="Scroll" accessibleName={t("local.subprocessSearch.section")} noDataText={t("local.subprocessTable.empty")} loading={loading} inert={busy || loading}
            features={editable ? <TableSelectionMulti selected={[...selected].join(" ")} onChange={(event) => setSelected(event.target.getSelectedAsSet())} /> : undefined}
            headerRow={<TableHeaderRow><TableHeaderCell>{t("local.subprocessTable.code")}</TableHeaderCell><TableHeaderCell>{t("local.subprocessTable.name")}</TableHeaderCell><TableHeaderCell>{t("common.status")}</TableHeaderCell></TableHeaderRow>}>
            {displayed.map((item) => <TableRow key={item.subprocessId} rowKey={item.subprocessId}>
                <TableCell><Text>{item.code}</Text></TableCell><TableCell><Text>{item.name}</Text></TableCell>
                <TableCell><ObjectStatus state={item.change ? "Information" : item.original?.status === "ACTIVE" ? "Positive" : "None"}>
                    {item.change ? t(item.change.operation === "DELETE" ? "local.subprocessTable.draftDelete"
                        : item.change.operation === "ACTIVATE" ? "local.subprocessTable.draftActive"
                        : item.change.operation === "INACTIVATE" ? "local.subprocessTable.draftInactive" : "local.subprocessTable.draft")
                        : t(`local.status.${item.original?.status ?? "ACTIVE"}`)}
                </ObjectStatus></TableCell>
            </TableRow>)}
        </Table>
        </FlexBox>
        {pickerOpen ? <OrganizationSubprocessSearchDialog excludedIds={excludedIds} onClose={() => setPickerOpen(false)}
            busy={busy} onSelected={stage} /> : null}
    </FlexBox>;
}
