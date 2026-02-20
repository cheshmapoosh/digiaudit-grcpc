import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import { MessageStrip } from "@ui5/webcomponents-react";

import OrganizationsListReport from "./OrganizationsListReport";
import OrganizationObjectPage from "./OrganizationObjectPage";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { organizationService } from "../api/organization.service";

type FclLayout =
    | "OneColumn"
    | "TwoColumnsStartExpanded"
    | "TwoColumnsMidExpanded"
    | "ThreeColumnsMidExpanded"
    | "ThreeColumnsEndExpanded";

type ErrorKey = "DUPLICATE_CODE" | "HAS_CHILDREN" | "NOT_FOUND" | "UNKNOWN";

function useOrgRouteMode() {
    const { orgId } = useParams();
    const location = useLocation();

    const isNew = location.pathname.endsWith("/new");
    const isEdit = location.pathname.endsWith("/edit");
    const hasMid = isNew || !!orgId;

    const mode: "create" | "edit" | "view" =
        isNew ? "create" : isEdit ? "edit" : "view";

    return { orgId, hasMid, mode };
}

function mapError(e: unknown): ErrorKey {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "DUPLICATE_CODE") return "DUPLICATE_CODE";
    if (msg === "HAS_CHILDREN") return "HAS_CHILDREN";
    if (msg === "NOT_FOUND") return "NOT_FOUND";
    return "UNKNOWN";
}



export default function OrganizationsFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { orgId, hasMid, mode } = useOrgRouteMode();

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

    // ===== List refresh strategy (simple & reliable) =====
    // با تغییر key، ListReport remount می‌شود و دوباره list() می‌زند
    const [listVersion, setListVersion] = useState(0);
    const bumpList = () => setListVersion((v) => v + 1);

    // ===== Delete management in Shell (SAP-like) =====
    const [deleteId, setDeleteId] = useState<string | undefined>(undefined);
    const [deleteLabel, setDeleteLabel] = useState<string | undefined>(undefined);
    const [busyDelete, setBusyDelete] = useState(false);

    const [globalError, setGlobalError] = useState<string | undefined>(undefined);
    const [listCache, setListCache] = useState<Organization[]>([]);
    const [treeFocusId, setTreeFocusId] = useState<string | undefined>(undefined);
    const [expandOneLevelForId, setExpandOneLevelForId] = useState<string | undefined>(undefined);

    const location = useLocation();

    const parentIdFromQuery = useMemo(() => {
        const v = new URLSearchParams(location.search).get("parentId");
        return v ? v : undefined;
    }, [location.search]);

    useEffect(() => {
        // ✅ در create اگر parentId داریم، Tree روی parent باشد
        if (mode === "create" && parentIdFromQuery) {
            setTreeFocusId(parentIdFromQuery);
            return;
        }

        // ✅ در view/edit، Tree روی orgId باشد
        if (orgId) {
            setTreeFocusId(orgId);
            return;
        }

        // ✅ اگر هیچکدام نبود، focus را خالی کن
        setTreeFocusId(undefined);
    }, [mode, parentIdFromQuery, orgId]);


    function openDelete(id: string) {
        setGlobalError(undefined);
        setDeleteId(id);

        // label را اگر نداریم هم مشکلی نیست
        // اگر خواستی دقیق‌تر کنیم: از cached list در Shell یا یک getById بگیریم
        setDeleteLabel(undefined);
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
            const deleted = listCache.find(x => x.id === deleteId);
            const parentId = deleted?.parentId;

            await organizationService.remove(deleteId);

            closeDelete();
            bumpList();

            if (parentId && listCache.some(x => x.id === parentId)) {
                navigate(`/organizations/${parentId}`);
            } else {
                navigate("/organizations");
            }
        } catch (e) {
            const key = mapError(e);
            if (key === "HAS_CHILDREN")
                setGlobalError(t("org.errors.hasChildren", "این سازمان زیرمجموعه دارد و قابل حذف نیست"));
            else if (key === "NOT_FOUND")
                setGlobalError(t("org.errors.notFound", "رکورد یافت نشد"));
            else setGlobalError(t("common.error", "خطا"));
            setBusyDelete(false);
        }
    }


    return (
        <div style={{ height: "100%", minHeight: 0 }}>
            {/* خطای سراسری shell (مثل message strip SAP) */}
            {globalError && (
                <div style={{ padding: "8px 12px" }}>
                    <MessageStrip design="Negative" onClose={() => setGlobalError(undefined)}>
                        {globalError}
                    </MessageStrip>
                </div>
            )}

            {/* @ts-ignore - ui5 web component */}
            <ui5-flexible-column-layout
                layout={layout}
                onLayout-change={onLayoutChange}
                style={{ height: "100%" }}
            >
                {/* Begin column: List Report */}
                <div
                    slot="startColumn"
                    style={{ height: "100%", minHeight: 0, overflow: "auto" }}
                >
                    <OrganizationsListReport
                        key={listVersion} // ✅ refresh on delete/save/create
                        selectedId={orgId}
                        treeFocusId={treeFocusId}
                        expandOneLevelForId={expandOneLevelForId}
                        onSelect={(id) => navigate(`/organizations/${id}`)}
                        onCreate={() => navigate("/organizations/new")}
                        onDataLoaded={(items) => setListCache(items)}
                    />
                </div>

                {/* Mid column: Object Page */}
                {hasMid && (
                    <div
                        slot="midColumn"
                        style={{ height: "100%", minHeight: 0, overflow: "auto" }}
                    >
                        <OrganizationObjectPage
                            mode={mode}
                            orgId={mode === "create" ? undefined : orgId}
                            onDone={() => navigate("/organizations")}
                            onEdit={(id) => navigate(`/organizations/${id}/edit`)}
                            onView={(id) => {
                                navigate(`/organizations/${id}`);
                                bumpList();
                            }}
                            onDelete={(id) => openDelete(id)}
                            onCreateChild={(parentId) => {
                                setTreeFocusId(parentId);
                                setExpandOneLevelForId(parentId); // ✅ بچه‌های parent را نشان بده
                                navigate(`/organizations/new?parentId=${encodeURIComponent(parentId)}`);
                            }}
                            onTreeFocusChange={(id) => {
                                setTreeFocusId(id);
                                if (id) setExpandOneLevelForId(id); // ✅ بچه‌های همان parent دیده شود
                            }}
                        />
                    </div>
                )}
            </ui5-flexible-column-layout>

            {/* Delete confirm dialog controlled by shell */}
            <DeleteConfirmDialog
                open={!!deleteId}
                title={t("org.delete.title", "حذف سازمان")}
                message={
                    deleteId
                        ? `${t("org.delete.msg", "آیا از حذف این رکورد مطمئن هستید؟")}${
                            deleteLabel ? ` (${deleteLabel})` : ""
                        }`
                        : t("org.delete.msg", "آیا از حذف این رکورد مطمئن هستید؟")
                }
                onCancel={closeDelete}
                onConfirm={confirmDelete}
                busy={busyDelete}
            />
        </div>
    );
}
