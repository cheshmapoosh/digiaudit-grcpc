import {
    createElement,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import {
    Dialog,
    MessageStrip,
} from "@ui5/webcomponents-react";

import type {
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "../domain/organization.model";
import type {
    OrganizationProcessAssignment,
    OrganizationSubProcessOption,
    OrganizationSubProcessView,
} from "../domain/organization-process-assignment.model";
import type { ProcessNode } from "@/features/process";
import {
    ROOT_PARENT as PROCESS_ROOT_PARENT,
    useProcessState,
} from "@/features/process";

import { useOrganizationState, ROOT_PARENT } from "../state/organization.state";
import { useOrganizationProcessAssignmentState } from "../state/organization-process-assignment.state";
import { hasChildren, sortOrganizations } from "../utils/organization.tree";

import OrganizationSummaryPanel from "../components/OrganizationSummaryPanel";
import OrganizationsListReport from "./OrganizationsListReport";
import OrganizationObjectPage, { type OrganizationTabKey } from "./OrganizationObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

const DIALOG_LARGE_VIEWPORT_QUERY = "(min-width: 1600px)";
const DIALOG_NORMAL_WIDTH = "96vw";
const DIALOG_LARGE_WIDTH = "92vw";
const EMPTY_ASSIGNMENTS: OrganizationProcessAssignment[] = [];
const MIN_PANEL_GAP = "1px";

function useOrganizationRouteMode(): RouteMode {
    const { organizationId } = useParams();
    const location = useLocation();

    if (location.pathname.endsWith("/new")) {
        return "create";
    }

    if (location.pathname.endsWith("/edit")) {
        return "edit";
    }

    if (organizationId) {
        return "view";
    }

    return "list";
}

function mapError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
                return "آیتم موردنظر یافت نشد";
            case "HAS_CHILDREN":
                return "امکان حذف واحدی که زیرمجموعه دارد وجود ندارد";
            case "PARENT_NOT_FOUND":
                return "والد انتخاب‌شده یافت نشد";
            case "INVALID_HIERARCHY":
                return "ساختار سلسله‌مراتبی سازمان معتبر نیست";
            default:
                return error.message;
        }
    }

    return fallback;
}

function resolveUiDir(): UiDir {
    if (typeof document === "undefined") {
        return "rtl";
    }

    const htmlDir = document.documentElement.getAttribute("dir");
    if (htmlDir === "rtl" || htmlDir === "ltr") {
        return htmlDir;
    }

    const bodyDir = document.body?.getAttribute("dir") ?? document.body?.dir;
    if (bodyDir === "rtl" || bodyDir === "ltr") {
        return bodyDir;
    }

    return "rtl";
}

function useResolvedUiDir(): UiDir {
    const [dir, setDir] = useState<UiDir>(() => resolveUiDir());

    useEffect(() => {
        if (typeof document === "undefined") {
            return;
        }

        const sync = () => setDir(resolveUiDir());

        const observer = new MutationObserver(sync);

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["dir"],
        });

        if (document.body) {
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ["dir"],
            });
        }

        return () => observer.disconnect();
    }, []);

    return dir;
}

function resolveMediaQuery(query: string): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia(query).matches;
}

function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => resolveMediaQuery(query));

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return;
        }

        const mediaQueryList = window.matchMedia(query);
        const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);

        mediaQueryList.addEventListener("change", handleChange);

        return () => mediaQueryList.removeEventListener("change", handleChange);
    }, [query]);

    return matches;
}

function isOwnDialogCloseEvent(event: unknown): boolean {
    const closeEvent = event as {
        target?: EventTarget | null;
        currentTarget?: EventTarget | null;
    };

    return Boolean(
        closeEvent.target &&
            closeEvent.currentTarget &&
            closeEvent.target === closeEvent.currentTarget,
    );
}

function resolveDialogTitle(
    routeMode: RouteMode,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (routeMode === "create") {
        return t("organization.create.title", {
            defaultValue: "ایجاد سازمان",
        });
    }

    if (routeMode === "edit") {
        return t("organization.edit.title", {
            defaultValue: "ویرایش سازمان",
        });
    }

    if (routeMode === "view") {
        return t("organization.view.title", {
            defaultValue: "نمایش سازمان",
        });
    }

    return "";
}

function sortProcessNodes(items: ProcessNode[]): ProcessNode[] {
    return [...items].sort((a, b) => {
        const orderCompare = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (orderCompare !== 0) {
            return orderCompare;
        }

        const codeCompare = a.code.localeCompare(b.code, "fa");
        if (codeCompare !== 0) {
            return codeCompare;
        }

        return a.title.localeCompare(b.title, "fa");
    });
}

function toSubProcessOption(
    subProcess: ProcessNode,
    nodesById: Record<string, ProcessNode>,
): OrganizationSubProcessOption {
    const parent = subProcess.parentId ? nodesById[subProcess.parentId] : null;

    return {
        processNodeId: subProcess.id,
        code: subProcess.code,
        title: subProcess.title,
        parentProcessCode: parent?.code,
        parentProcessTitle: parent?.title,
        status: subProcess.status,
    };
}

function countControlsBySubProcess(nodes: ProcessNode[]): Map<string, number> {
    const counts = new Map<string, number>();

    nodes.forEach((node) => {
        if (node.nodeType !== "control" || !node.parentId) {
            return;
        }

        counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1);
    });

    return counts;
}

function buildOrganizationSubProcessViews(
    assignments: OrganizationProcessAssignment[],
    nodesById: Record<string, ProcessNode>,
): OrganizationSubProcessView[] {
    const processNodes = Object.values(nodesById);
    const controlCounts = countControlsBySubProcess(processNodes);

    return assignments
        .map((assignment): OrganizationSubProcessView | null => {
            const subProcess = nodesById[assignment.processNodeId];

            if (!subProcess || subProcess.nodeType !== "subProcess") {
                return null;
            }

            const view: OrganizationSubProcessView = {
                ...toSubProcessOption(subProcess, nodesById),
                assignmentId: assignment.id,
                organizationId: assignment.organizationId,
                assignmentType: assignment.assignmentType,
                validFrom: assignment.validFrom,
                validTo: assignment.validTo,
                isActive: assignment.isActive,
                description: subProcess.description,
                controlsCount: controlCounts.get(subProcess.id) ?? 0,
            };

            return view;
        })
        .filter((item): item is OrganizationSubProcessView => item !== null)
        .sort((a, b) => {
            const codeCompare = a.code.localeCompare(b.code, "fa");
            return codeCompare !== 0 ? codeCompare : a.title.localeCompare(b.title, "fa");
        });
}

export default function OrganizationsFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { organizationId } = useParams();

    const routeMode = useOrganizationRouteMode();
    const appDir = useResolvedUiDir();
    const isLargeDialogViewport = useMediaQuery(DIALOG_LARGE_VIEWPORT_QUERY);

    const nodesById = useOrganizationState((state) => state.nodesById);
    const loading = useOrganizationState((state) => state.loading);
    const loadChildren = useOrganizationState((state) => state.loadChildren);
    const createNode = useOrganizationState((state) => state.createNode);
    const updateNode = useOrganizationState((state) => state.updateNode);
    const removeNode = useOrganizationState((state) => state.removeNode);
    const processNodesById = useProcessState((state) => state.nodesById);
    const processLoading = useProcessState((state) => state.loading);
    const loadProcessChildren = useProcessState((state) => state.loadChildren);
    const assignmentsByOrganizationId = useOrganizationProcessAssignmentState(
        (state) => state.assignmentsByOrganizationId,
    );
    const assignmentsLoading = useOrganizationProcessAssignmentState(
        (state) => state.loading,
    );
    const loadAssignmentsForOrganization = useOrganizationProcessAssignmentState(
        (state) => state.loadForOrganization,
    );
    const assignSubProcessToOrganization = useOrganizationProcessAssignmentState(
        (state) => state.assignSubProcess,
    );
    const removeSubProcessFromOrganization = useOrganizationProcessAssignmentState(
        (state) => state.removeAssignment,
    );

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<OrganizationNode | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [objectActiveTab, setObjectActiveTab] =
        useState<OrganizationTabKey>("general");

    /**
     * selectedTreeId:
     * نودی که در درخت انتخاب شده و پنل جزئیات کناری را کنترل می‌کند.
     *
     * route organizationId:
     * نودی که داخل modal نمایش/ویرایش می‌شود.
     */
    const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
    const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<string | null>(null);

    const items = useMemo(() => sortOrganizations(Object.values(nodesById)), [nodesById]);
    const processItems = useMemo(
        () => sortProcessNodes(Object.values(processNodesById)),
        [processNodesById],
    );
    const availableSubProcesses = useMemo(
        () =>
            processItems
                .filter((item) => item.nodeType === "subProcess")
                .map((item) => toSubProcessOption(item, processNodesById)),
        [processItems, processNodesById],
    );

    const selectedRouteItem = organizationId ? nodesById[organizationId] ?? null : null;
    const selectedTreeItem = selectedTreeId ? nodesById[selectedTreeId] ?? null : null;

    const queryParentId = useMemo(() => {
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get("parentId");
    }, [location.search]);

    const objectTabScopeKey = useMemo(() => {
        if (routeMode === "create") {
            return `create:${queryParentId ?? "root"}`;
        }

        return `org:${organizationId ?? "none"}`;
    }, [organizationId, queryParentId, routeMode]);

    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("organization.errors.loadList", {
                        defaultValue: "خطا در بارگذاری واحدهای سازمانی",
                    }),
                ),
            );
        });
    }, [loadChildren, t]);

    useEffect(() => {
        setObjectActiveTab("general");
    }, [objectTabScopeKey]);

    useEffect(() => {
        void loadProcessChildren(PROCESS_ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("process.errors.loadList", {
                        defaultValue: "خطا در بارگذاری فرآیندها",
                    }),
                ),
            );
        });
    }, [loadProcessChildren, t]);

    /**
     * در حالت create child، درخت باید parent را انتخاب/باز کند.
     * در حالت view/edit modal، درخت روی همان organizationId فوکوس می‌کند.
     * در حالت list، روی selectedTreeId می‌ماند.
     */
    const treeSelectedId = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return organizationId ?? selectedTreeId;
        }

        return selectedTreeId;
    }, [organizationId, queryParentId, routeMode, selectedTreeId]);

    const treeExpansionAnchorIdValue = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return organizationId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        return selectedTreeId ?? treeExpansionAnchorId;
    }, [
        organizationId,
        queryParentId,
        routeMode,
        selectedTreeId,
        treeExpansionAnchorId,
    ]);

    /**
     * کلیک روی نود درخت:
     * فقط انتخاب و نمایش جزئیات کناری.
     * هیچ modal باز نمی‌شود.
     */
    const handleSelect = useCallback((id: string) => {
        setSelectedTreeId(id);
        setTreeExpansionAnchorId(id);
    }, []);

    /**
     * دکمه نمایش:
     * modal نمایش سازمان را باز می‌کند.
     */
    const handleShow = useCallback(
        (id: string) => {
            setSelectedTreeId(id);
            setTreeExpansionAnchorId(id);
            navigate(`/organizations/${id}`);
        },
        [navigate],
    );

    /**
     * دکمه ایجاد سازمان:
     * اگر نودی انتخاب شده باشد، زیر همان نود ایجاد می‌کند.
     * اگر نودی انتخاب نشده باشد، root ایجاد می‌کند.
     */
    const handleCreate = useCallback(() => {
        if (selectedTreeId) {
            setTreeExpansionAnchorId(selectedTreeId);
            navigate(`/organizations/new?parentId=${encodeURIComponent(selectedTreeId)}`);
            return;
        }

        navigate("/organizations/new");
    }, [navigate, selectedTreeId]);

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? organizationId ?? selectedTreeId;

            if (!targetId) {
                return;
            }

            setSelectedTreeId(targetId);
            setTreeExpansionAnchorId(targetId);
            navigate(`/organizations/${targetId}/edit`);
        },
        [navigate, organizationId, selectedTreeId],
    );

    /**
     * بستن modal.
     * پنل جزئیات کناری روی آخرین انتخاب باقی می‌ماند.
     */
    const handleCancel = useCallback(() => {
        const currentAnchorId =
            routeMode === "create"
                ? queryParentId ?? selectedTreeId
                : organizationId ?? selectedTreeId;

        if (currentAnchorId) {
            setSelectedTreeId(currentAnchorId);
            setTreeExpansionAnchorId(currentAnchorId);
        }

        navigate("/organizations");
    }, [navigate, organizationId, queryParentId, routeMode, selectedTreeId]);

    const handleSubmitCreate = useCallback(
        async (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => {
            try {
                setSubmitting(true);
                setPageError(null);

                const selectedParentId =
                    typeof payload.parentId === "string" && payload.parentId.trim()
                        ? payload.parentId
                        : null;

                const created = await createNode(selectedParentId, {
                    code: String(payload.code ?? "").trim(),
                    name: String(payload.name ?? "").trim(),
                    type: payload.type ?? "unit",
                    description:
                        typeof payload.description === "string"
                            ? payload.description.trim() || undefined
                            : undefined,
                    parentId: selectedParentId,
                    status: payload.status === "inactive" ? "inactive" : "active",
                    validFrom:
                        typeof payload.validFrom === "string"
                            ? payload.validFrom || undefined
                            : undefined,
                    validTo:
                        typeof payload.validTo === "string"
                            ? payload.validTo || undefined
                            : undefined,
                    location:
                        typeof payload.location === "string"
                            ? payload.location.trim() || undefined
                            : undefined,
                });

                /**
                 * بعد از create:
                 * - نود جدید در درخت انتخاب می‌شود.
                 * - parent باز می‌ماند.
                 * - modal نمایش همان سازمان باز می‌شود.
                 */
                setSelectedTreeId(created.id);
                setTreeExpansionAnchorId(created.parentId ?? created.id);
                navigate(`/organizations/${created.id}`);
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("organization.errors.create", {
                            defaultValue: "خطا در ایجاد واحد سازمانی",
                        }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [createNode, navigate, t],
    );

    const handleSubmitUpdate = useCallback(
        async (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => {
            if (!organizationId) {
                return;
            }

            try {
                setSubmitting(true);
                setPageError(null);

                const updatePayload: OrganizationNodeUpdate = {
                    code: typeof payload.code === "string" ? payload.code.trim() : payload.code,
                    name: typeof payload.name === "string" ? payload.name.trim() : payload.name,
                    type: payload.type,
                    description:
                        typeof payload.description === "string"
                            ? payload.description.trim() || undefined
                            : payload.description,
                    parentId: payload.parentId ?? null,
                    status: payload.status,
                    validFrom:
                        typeof payload.validFrom === "string"
                            ? payload.validFrom || undefined
                            : payload.validFrom,
                    validTo:
                        typeof payload.validTo === "string"
                            ? payload.validTo || undefined
                            : payload.validTo,
                };

                await updateNode(organizationId, updatePayload);

                setSelectedTreeId(organizationId);
                setTreeExpansionAnchorId(updatePayload.parentId ?? organizationId);

                navigate(`/organizations/${organizationId}`);
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("organization.errors.update", {
                            defaultValue: "خطا در بروزرسانی واحد سازمانی",
                        }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [navigate, organizationId, t, updateNode],
    );

    const requestDelete = useCallback(
        (id: string) => {
            const target = nodesById[id];

            if (!target) {
                setPageError(t("organization.errors.notFound", { defaultValue: "آیتم یافت نشد" }));
                return;
            }

            if (hasChildren(items, id)) {
                setPageError(
                    t("organization.errors.hasChildren", {
                        defaultValue: "امکان حذف واحدی که زیرمجموعه دارد وجود ندارد",
                    }),
                );
                return;
            }

            setDeleteCandidate(target);
        },
        [items, nodesById, t],
    );

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteCandidate) {
            return;
        }

        try {
            setSubmitting(true);
            setPageError(null);

            const parentId = deleteCandidate.parentId ?? null;

            await removeNode(deleteCandidate.id);
            setDeleteCandidate(null);

            /**
             * بعد از حذف:
             * - modal بسته می‌شود.
             * - انتخاب به parent منتقل می‌شود.
             * - اگر parent وجود نداشت، selection خالی می‌شود.
             */
            if (parentId) {
                setSelectedTreeId(parentId);
                setTreeExpansionAnchorId(parentId);
                navigate("/organizations");
                return;
            }

            setSelectedTreeId(null);
            setTreeExpansionAnchorId(null);
            navigate("/organizations");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("organization.errors.delete", {
                        defaultValue: "خطا در حذف واحد سازمانی",
                    }),
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }, [deleteCandidate, navigate, removeNode, t]);

    const createInitialValue = useMemo<OrganizationNode | null>(() => {
        if (routeMode !== "create") {
            return null;
        }

        return {
            id: "",
            code: "",
            name: "",
            type: "unit",
            description: "",
            parentId: queryParentId,
            status: "active",
            validFrom: "",
            validTo: "",
        } as OrganizationNode;
    }, [queryParentId, routeMode]);

    const showModal = routeMode === "create" || routeMode === "view" || routeMode === "edit";

    const handleObjectDialogClose = useCallback(
        (event: unknown) => {
            if (!isOwnDialogCloseEvent(event) || !showModal) {
                return;
            }

            handleCancel();
        },
        [handleCancel, showModal],
    );

    const objectMode =
        routeMode === "create"
            ? "create"
            : routeMode === "edit"
                ? "edit"
                : "view";

    const objectValue = routeMode === "create" ? createInitialValue : selectedRouteItem;

    useEffect(() => {
        if (!showModal || !objectValue?.id) {
            return;
        }

        void loadAssignmentsForOrganization(objectValue.id).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("organization.subProcesses.errors.load", {
                        defaultValue: "خطا در بارگذاری زیر فرآیندهای سازمان",
                    }),
                ),
            );
        });
    }, [loadAssignmentsForOrganization, objectValue?.id, showModal, t]);

    const currentAssignments = objectValue?.id
        ? assignmentsByOrganizationId[objectValue.id] ?? EMPTY_ASSIGNMENTS
        : EMPTY_ASSIGNMENTS;

    const organizationSubProcesses = useMemo(
        () => buildOrganizationSubProcessViews(currentAssignments, processNodesById),
        [currentAssignments, processNodesById],
    );

    const handleAssignSubProcessToOrganization = useCallback(
        async (processNodeId: string) => {
            if (!objectValue?.id) {
                return;
            }

            try {
                setSubmitting(true);
                setPageError(null);

                await assignSubProcessToOrganization({
                    organizationId: objectValue.id,
                    processNodeId,
                    assignmentType: "scope",
                    isActive: true,
                });
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("organization.subProcesses.errors.assign", {
                            defaultValue: "خطا در تخصیص زیر فرآیند به سازمان",
                        }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [assignSubProcessToOrganization, objectValue?.id, t],
    );

    const handleRemoveSubProcessAssignment = useCallback(
        async (assignmentId: string) => {
            if (!objectValue?.id) {
                return;
            }

            try {
                setSubmitting(true);
                setPageError(null);

                await removeSubProcessFromOrganization(objectValue.id, assignmentId);
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("organization.subProcesses.errors.remove", {
                            defaultValue: "خطا در حذف زیر فرآیند از سازمان",
                        }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [objectValue?.id, removeSubProcessFromOrganization, t],
    );

    const showInlineSummaryPane = Boolean(selectedTreeItem);
    const fclLayout: FclLayout = showInlineSummaryPane ? "TwoColumnsStartExpanded" : "OneColumn";

    const slotContainerStyle = useMemo<CSSProperties>(
        () => ({
            height: "100%",
            boxSizing: "border-box",
            padding: "1rem",
            overflow: "hidden",
            direction: appDir,
            background: "var(--sapBackgroundColor)",
        }),
        [appDir],
    );

    const startSlotContainerStyle: CSSProperties = {
        ...slotContainerStyle,
        paddingInlineEnd: 0,
    };

    const midSlotContainerStyle: CSSProperties = {
        ...slotContainerStyle,
        paddingInlineStart: 0,
    };

    const frameStyle: CSSProperties = {
        height: "100%",
        minHeight: 0,
        overflow: "auto",
        border: "1px solid var(--sapGroup_ContentBorderColor)",
        borderRadius: "0",
        background: "var(--sapBackgroundColor)",
        boxSizing: "border-box",
        padding: "1rem",
    };

    const startFrameStyle: CSSProperties = {
        ...frameStyle,
        marginInlineEnd: MIN_PANEL_GAP,
    };

    const midFrameStyle: CSSProperties = {
        ...frameStyle,
        marginInlineStart: 0,
    };

    const dialogContentStyle = useMemo<CSSProperties>(
        () => ({
            width: "100%",
            direction: appDir,
            boxSizing: "border-box",
            padding: 0,
        }),
        [appDir],
    );

    const dialogStyle = useMemo<CSSProperties>(() => {
        const width = isLargeDialogViewport ? DIALOG_LARGE_WIDTH : DIALOG_NORMAL_WIDTH;

        return {
            width,
            maxWidth: width,
            maxHeight: "calc(100vh - 2rem)",
        };
    }, [isLargeDialogViewport]);

    const listColumn = createElement(
        "div",
        {
            slot: "startColumn",
            dir: appDir,
            style: startSlotContainerStyle,
        },
        <div style={startFrameStyle}>
            <OrganizationsListReport
                items={items}
                selectedId={treeSelectedId}
                expansionAnchorId={treeExpansionAnchorIdValue}
                searchText={searchText}
                busy={loading || submitting}
                error={!showModal ? pageError : null}
                onSearchTextChange={setSearchText}
                onCreate={handleCreate}
                onShow={handleShow}
                onDelete={requestDelete}
                onSelect={handleSelect}
            />
        </div>,
    );

    const inlineSummaryColumn = showInlineSummaryPane
        ? createElement(
            "div",
            {
                slot: "midColumn",
                dir: appDir,
                style: midSlotContainerStyle,
            },
            <div style={midFrameStyle}>
                <OrganizationSummaryPanel
                    value={selectedTreeItem}
                    busy={loading || submitting}
                    error={!showModal ? pageError : null}
                    onEdit={handleEdit}
                    onCancel={() => {
                        setSelectedTreeId(null);
                        setTreeExpansionAnchorId(null);
                    }}
                />
            </div>,
        )
        : null;

    const dialogTitle = resolveDialogTitle(routeMode, t);

    return (
        <>
            {createElement(
                "ui5-flexible-column-layout",
                {
                    layout: fclLayout,
                    dir: appDir,
                    "disable-resizing": true,
                    style: {
                        height: "calc(100vh - 10rem)",
                        minHeight: "36rem",
                        display: "block",
                    },
                },
                listColumn,
                inlineSummaryColumn,
            )}

            <Dialog
                open={showModal}
                accessibleName={dialogTitle}
                className="organizationObjectDialog"
                style={dialogStyle}
                onClose={handleObjectDialogClose}
            >
                <ModalDialogHeader title={dialogTitle} onClose={handleObjectDialogClose} />
                <div style={dialogContentStyle}>
                    {objectValue ? (
                        <OrganizationObjectPage
                            key={`${objectMode}:${objectValue.id || "new"}:${queryParentId ?? objectValue.parentId ?? "root"}`}
                            mode={objectMode}
                            allItems={items}
                            value={objectValue}
                            activeTab={objectActiveTab}
                            subProcesses={organizationSubProcesses}
                            availableSubProcesses={availableSubProcesses}
                            subProcessesBusy={processLoading || assignmentsLoading}
                            busy={loading || submitting}
                            error={pageError}
                            onSubmit={routeMode === "create" ? handleSubmitCreate : handleSubmitUpdate}
                            onCancel={handleCancel}
                            onEdit={() => handleEdit()}
                            onAssignSubProcess={handleAssignSubProcessToOrganization}
                            onRemoveSubProcessAssignment={handleRemoveSubProcessAssignment}
                            onActiveTabChange={setObjectActiveTab}
                        />
                    ) : (
                        <MessageStrip design="Information" hideCloseButton>
                            {t("organization.object.notFound", {
                                defaultValue: "واحد سازمانی انتخاب‌شده یافت نشد",
                            })}
                        </MessageStrip>
                    )}
                </div>
            </Dialog>

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("organization.delete.title", { defaultValue: "حذف واحد سازمانی" })}
                message={t("organization.delete.confirm", {
                    defaultValue: 'آیا از حذف "{{title}}" مطمئن هستید؟',
                    title: deleteCandidate?.name ?? "",
                })}
                confirmText={t("common.delete", { defaultValue: "حذف" })}
                cancelText={t("common.cancel", { defaultValue: "انصراف" })}
                loading={submitting}
                onClose={() => setDeleteCandidate(null)}
                onConfirm={() => {
                    void handleConfirmDelete();
                }}
            />
        </>
    );
}
