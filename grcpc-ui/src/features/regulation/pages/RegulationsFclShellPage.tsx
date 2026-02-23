// src/features/regulation/pages/RegulationsFclShellPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";
import { MessageStrip } from "@ui5/webcomponents-react";

import RegulationsListReport from "./RegulationsListReport";
import RegulationObjectPage from "./RegulationObjectPage";
import { DeleteConfirmDialog } from "../../../shared/components/DeleteConfirmDialog"; // reuse
import { regulationService } from "../service/regulation.service";

type FclLayout =
    | "OneColumn"
    | "TwoColumnsStartExpanded"
    | "TwoColumnsMidExpanded"
    | "ThreeColumnsMidExpanded"
    | "ThreeColumnsEndExpanded";

type ErrorKey = "HAS_CHILDREN" | "NOT_FOUND" | "UNKNOWN";

function useRegulationRouteMode() {
    const { regulationId } = useParams();
    const location = useLocation();

    const isNew = location.pathname.endsWith("/new");
    const isEdit = location.pathname.endsWith("/edit");
    const hasMid = isNew || !!regulationId;

    const mode: "create" | "edit" | "view" = isNew ? "create" : isEdit ? "edit" : "view";
    return { regulationId, hasMid, mode };
}

function mapError(e: unknown): ErrorKey {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "HAS_CHILDREN") return "HAS_CHILDREN";
    if (msg === "NOT_FOUND") return "NOT_FOUND";
    return "UNKNOWN";
}

export default function RegulationsFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { regulationId, hasMid, mode } = useRegulationRouteMode();
    const location = useLocation();

    // ===== FCL layout =====
    const computedLayout: FclLayout = useMemo(
        () => (hasMid ? "TwoColumnsStartExpanded" : "OneColumn"),
        [hasMid]
    );
    const [layout, setLayout] = useState<FclLayout>(computedLayout);
    useEffect(() => setLayout(computedLayout), [computedLayout]);

    const onLayoutChange = (e: any) => {
        const next = e?.detail?.layout as FclLayout | undefined;
        if (next) setLayout(next);
    };

    // ===== List refresh strategy =====
    const [listVersion, setListVersion] = useState(0);
    const bumpList = () => setListVersion((v) => v + 1);

    // ===== Delete management =====
    const [deleteId, setDeleteId] = useState<string | undefined>(undefined);
    const [deleteLabel, setDeleteLabel] = useState<string | undefined>(undefined);
    const [busyDelete, setBusyDelete] = useState(false);

    const [globalError, setGlobalError] = useState<string | undefined>(undefined);
    const [listCache, setListCache] = useState<any[]>([]);

    const [treeFocusId, setTreeFocusId] = useState<string | undefined>(undefined);
    const [expandOneLevelForId, setExpandOneLevelForId] = useState<string | undefined>(undefined);

    const parentIdFromQuery = useMemo(() => {
        const v = new URLSearchParams(location.search).get("parentId");
        return v ? v : undefined;
    }, [location.search]);

    useEffect(() => {
        if (mode === "create" && parentIdFromQuery) {
            setTreeFocusId(parentIdFromQuery);
            return;
        }
        if (regulationId) {
            setTreeFocusId(regulationId);
            return;
        }
        setTreeFocusId(undefined);
    }, [mode, parentIdFromQuery, regulationId]);

    function openDelete(id: string) {
        setGlobalError(undefined);
        setDeleteId(id);
        const found = listCache.find((x: any) => x.id === id);
        setDeleteLabel(found ? `${found.code ?? ""} ${found.title ?? ""}`.trim() : undefined);
    }

    function closeDelete() {
        setDeleteId(undefined);
        setDeleteLabel(undefined);
        setBusyDelete(false);
    }

    async function confirmDelete() {
        if (!deleteId) return;

        setBusyDelete(true);
        setGlobalError(undefined);

        try {
            const deleted = listCache.find((x: any) => x.id === deleteId);
            const parentId = deleted?.parentId ?? null;

            await regulationService.delete(deleteId);

            closeDelete();
            bumpList();

            if (parentId && listCache.some((x: any) => x.id === parentId)) {
                navigate(`/regulations/${parentId}`);
            } else {
                navigate("/regulations");
            }
        } catch (e) {
            const key = mapError(e);
            if (key === "HAS_CHILDREN")
                setGlobalError(
                    t("regulation.errors.hasChildren", "این قانون/مقرره زیرمجموعه دارد و قابل حذف نیست")
                );
            else if (key === "NOT_FOUND")
                setGlobalError(t("regulation.errors.notFound", "رکورد یافت نشد"));
            else setGlobalError(t("common.error", "خطا"));
            setBusyDelete(false);
        }
    }

    return (
        <div style={{ height: "100%", minHeight: 0 }}>
            {globalError && (
                <div style={{ padding: "8px 12px" }}>
                    <MessageStrip design="Negative" onClose={() => setGlobalError(undefined)}>
                        {globalError}
                    </MessageStrip>
                </div>
            )}

            {/* @ts-ignore */}
            <ui5-flexible-column-layout
                layout={layout}
                onLayout-change={onLayoutChange}
                style={{ height: "100%" }}
            >
                {/* Start column: List Report */}
                <div slot="startColumn" style={{ height: "100%", minHeight: 0, overflow: "auto" }}>
                    <RegulationsListReport
                        key={listVersion}
                        selectedId={regulationId}
                        treeFocusId={treeFocusId}
                        expandOneLevelForId={expandOneLevelForId}
                        onSelect={(id) => navigate(`/regulations/${id}`)}
                        onCreate={() => navigate("/regulations/new")}
                        onDataLoaded={(items) => setListCache(items)}
                    />
                </div>

                {/* Mid column: Object Page */}
                {hasMid && (
                    <div slot="midColumn" style={{ height: "100%", minHeight: 0, overflow: "auto" }}>
                        <RegulationObjectPage
                            mode={mode}
                            regulationId={mode === "create" ? undefined : regulationId}
                            onDone={() => navigate("/regulations")}
                            onEdit={(id) => navigate(`/regulations/${id}/edit`)}
                            onView={(id) => {
                                navigate(`/regulations/${id}`);
                                bumpList();
                            }}
                            onDelete={(id) => openDelete(id)}
                            onCreateChild={(parentId) => {
                                setTreeFocusId(parentId);
                                setExpandOneLevelForId(parentId);
                                navigate(`/regulations/new?parentId=${encodeURIComponent(parentId)}`);
                            }}
                            onTreeFocusChange={(id) => {
                                setTreeFocusId(id);
                                if (id) setExpandOneLevelForId(id);
                            }}
                        />
                    </div>
                )}
            </ui5-flexible-column-layout>

            <DeleteConfirmDialog
                open={!!deleteId}
                title={t("regulation.delete.title", "حذف قانون/مقرره")}
                message={
                    deleteId
                        ? `${t(
                            "regulation.delete.msg",
                            "آیا از حذف این رکورد مطمئن هستید؟"
                        )}${deleteLabel ? ` (${deleteLabel})` : ""}`
                        : t("regulation.delete.msg", "آیا از حذف این رکورد مطمئن هستید؟")
                }
                onCancel={closeDelete}
                onConfirm={confirmDelete}
                busy={busyDelete}
            />
        </div>
    );
}