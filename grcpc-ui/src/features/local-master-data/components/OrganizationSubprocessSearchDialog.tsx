import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { processService, type ProcessNode } from "@/features/process";
import { HierarchyMultiSelectionDialog, type HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";

const EMPTY_SELECTION = new Set<string>();

interface Props {
    excludedIds: ReadonlySet<string>;
    busy: boolean;
    onClose: () => void;
    onSelected: (rows: ProcessNode[]) => void;
}

/** Read-only SearchDialog. Confirming stages rows; only the Organization modal Save can write. */
export default function OrganizationSubprocessSearchDialog({ excludedIds, busy, onClose, onSelected }: Props) {
    const { t } = useTranslation();
    const [processes, setProcesses] = useState<ProcessNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selection, setSelection] = useState<Set<string>>(EMPTY_SELECTION);
    useEffect(() => {
        let current = true;
        void processService.list().then((nodes) => {
            if (current) { setProcesses(nodes); setLoading(false); }
        }).catch(() => {
            if (current) { setLoading(false); setError(t("local.subprocessSearch.loadError")); }
        });
        return () => { current = false; };
    }, [t]);
    const nodes = useMemo<HierarchySelectionNode[]>(() => processes.filter((node) => node.status !== "DELETED").map((node) => {
        const subprocess = node.nodeType === "SUBPROCESS";
        const added = subprocess && excludedIds.has(node.id);
        const suffix = added ? t("local.subprocessSearch.assigned")
            : node.status !== "ACTIVE" ? t(`local.status.${node.status}`) : "";
        return {
            id: subprocess ? node.id : `process:${node.id}`,
            parentId: node.parentId ? `process:${node.parentId}` : null,
            code: node.code,
            name: suffix ? `${node.title} (${suffix})` : node.title,
            selectable: subprocess && node.status === "ACTIVE" && !added,
        };
    }), [excludedIds, processes, t]);
    const eligible = new Set(nodes.filter((node) => node.selectable).map((node) => node.id));
    const validSelection = selection.size > 0 && [...selection].every((id) => eligible.has(id));
    return <HierarchyMultiSelectionDialog open title={t("local.subprocessSearch.title")}
        searchAccessibleName={t("local.subprocessSearch.search")} nodes={nodes}
        selectedIds={EMPTY_SELECTION} busy={busy} loading={loading} error={error}
        description={t("local.subprocessSearch.draftHint")} confirmDisabled={!validSelection}
        confirmText={t("common.select")} cancelText={t("common.cancel")}
        onSelectionChange={setSelection} onConfirm={(ids) => {
            if (!busy && !loading && ids.size && [...ids].every((id) => eligible.has(id))) {
                onSelected(processes.filter((node) => ids.has(node.id) && node.nodeType === "SUBPROCESS"));
            }
        }} onClose={onClose} />;
}
