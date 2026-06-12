import {
    createElement,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import {
    BusyIndicator,
    Label,
    MessageStrip,
    Title,
} from "@ui5/webcomponents-react";

import type {
    AttachExistingControlRequest,
    ControlDetails,
    ControlStructureNode,
    CreateControlAndAssignRequest,
    UpdateControlAssignmentRequest,
} from "../domain/control.model";
import { useControlState } from "../state/control.state";
import {
    findControlNodeById,
    isControlNode,
    resolveSubProcessContext,
} from "../utils/control.structure";
import type { ControlCreateAction } from "../components/ControlActionMenu";
import AttachControlDialog from "./AttachControlDialog";
import ControlObjectPage from "./ControlObjectPage";
import ControlsListReport from "./ControlsListReport";
import CreateControlDialog from "./CreateControlDialog";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { formatPersianDate } from "@/shared/utils/date.utils";

type RouteMode = "list" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

interface SubProcessContext {
    subProcessId: string;
    subProcessTitle?: string | null;
}

function useControlRouteMode(): RouteMode {
    const { controlAssignmentId } = useParams();
    const location = useLocation();

    if (controlAssignmentId && location.pathname.endsWith("/edit")) {
        return "edit";
    }

    if (controlAssignmentId) {
        return "view";
    }

    return "list";
}

function mapError(
    error: unknown,
    fallback: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
            case "CONTROL_ASSIGNMENT_NOT_FOUND":
                return t("control.errors.notFound", {
                    defaultValue: "اتصال کنترل موردنظر یافت نشد",
                });
            case "CONTROL_NOT_FOUND":
                return t("control.errors.controlNotFound", {
                    defaultValue: "کنترل انتخاب‌شده یافت نشد",
                });
            case "SUB_PROCESS_NOT_FOUND":
                return t("control.errors.subProcessNotFound", {
                    defaultValue: "زیر فرآیند انتخاب‌شده یافت نشد",
                });
            case "DUPLICATE_ACTIVE_ASSIGNMENT":
                return t("control.errors.duplicateActiveAssignment", {
                    defaultValue: "این کنترل قبلاً به‌صورت فعال به این زیر فرآیند متصل شده است",
                });
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

function displayValue(value?: string | number | null): string {
    if (typeof value === "number") {
        return String(value);
    }

    return value?.trim() ? value : "-";
}

function formatValidityRange(validFrom?: string | null, validTo?: string | null): string {
    if (!validFrom && !validTo) {
        return "-";
    }

    return `${formatPersianDate(validFrom)} - ${formatPersianDate(validTo)}`;
}

function statusLabel(
    status: ControlStructureNode["status"],
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
}

function nodeTypeLabel(
    nodeType: ControlStructureNode["nodeType"],
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<ControlStructureNode["nodeType"], string> = {
        process: t("control.nodeType.process", { defaultValue: "فرآیند" }),
        subProcess: t("control.nodeType.subProcess", { defaultValue: "زیر فرآیند" }),
        control: t("control.nodeType.control", { defaultValue: "کنترل" }),
    };

    return labels[nodeType];
}

function SummaryRow({ label, value }: { label: string; value?: ReactNode }) {
    return (
        <>
            <Label showColon wrappingType="None">{label}</Label>
            <span style={{ minWidth: 0, overflowWrap: "anywhere", lineHeight: 1.7 }}>
                {value || "-"}
            </span>
        </>
    );
}

function ControlContextSummary({
    value,
    items,
    busy,
}: {
    value: ControlStructureNode;
    items: ControlStructureNode[];
    busy?: boolean;
}) {
    const { t } = useTranslation();
    const controlsCount = value.nodeType === "subProcess"
        ? items.filter(
            (item) =>
                item.nodeType === "control" &&
                (item.parentId === value.id || item.subProcessId === value.id),
        ).length
        : 0;

    return (
        <div style={{ display: "grid", gap: "1rem" }}>
            <Title level="H4">
                {t("control.summary.title", { defaultValue: "خلاصه ساختار کنترل" })}
            </Title>

            {busy ? <BusyIndicator active /> : null}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(8rem, max-content) minmax(0, 1fr)",
                    gap: "0.65rem 1rem",
                    alignItems: "start",
                }}
            >
                <SummaryRow label={t("control.fields.type", { defaultValue: "نوع" })} value={nodeTypeLabel(value.nodeType, t)} />
                <SummaryRow label={t("control.fields.code", { defaultValue: "کد" })} value={value.code} />
                <SummaryRow label={t("control.fields.name", { defaultValue: "نام" })} value={value.title} />
                <SummaryRow label={t("control.fields.description", { defaultValue: "شرح" })} value={value.description} />
                <SummaryRow label={t("control.fields.ownerName", { defaultValue: "مسئول" })} value={value.ownerName} />
                <SummaryRow
                    label={t("control.fields.validity", { defaultValue: "اعتبار" })}
                    value={formatValidityRange(value.validFrom, value.validTo)}
                />
                <SummaryRow
                    label={t("control.fields.status", { defaultValue: "وضعیت" })}
                    value={statusLabel(value.status, t)}
                />
                {value.nodeType === "subProcess" ? (
                    <SummaryRow
                        label={t("control.fields.controlsCount", { defaultValue: "تعداد کنترل‌ها" })}
                        value={String(controlsCount)}
                    />
                ) : null}
            </div>
        </div>
    );
}

function resolveSubProcessForAction(
    selectedNode: ControlStructureNode | null,
    selectedAssignment: ControlDetails | null,
    items: ControlStructureNode[],
): SubProcessContext | null {
    const directContext = resolveSubProcessContext(selectedNode);

    if (directContext) {
        return directContext;
    }

    if (selectedNode?.nodeType === "control") {
        if (selectedAssignment?.parentSubProcessId) {
            return {
                subProcessId: selectedAssignment.parentSubProcessId,
                subProcessTitle: selectedAssignment.parentSubProcessTitle,
            };
        }

        const parentNode = findControlNodeById(items, selectedNode.parentId);

        if (parentNode?.nodeType === "subProcess") {
            return {
                subProcessId: parentNode.id,
                subProcessTitle: parentNode.title,
            };
        }
    }

    return null;
}

export default function ControlsFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { controlAssignmentId } = useParams();
    const routeMode = useControlRouteMode();
    const appDir = useResolvedUiDir();

    const structureNodes = useControlState((state) => state.structureNodes);
    const assignmentsById = useControlState((state) => state.assignmentsById);
    const selectedId = useControlState((state) => state.selectedId);
    const loading = useControlState((state) => state.loading);
    const refreshStructure = useControlState((state) => state.refreshStructure);
    const loadAssignment = useControlState((state) => state.loadAssignment);
    const createAndAssign = useControlState((state) => state.createAndAssign);
    const attachExisting = useControlState((state) => state.attachExisting);
    const updateAssignment = useControlState((state) => state.updateAssignment);
    const deleteAssignment = useControlState((state) => state.deleteAssignment);
    const setSelectedId = useControlState((state) => state.setSelectedId);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [objectError, setObjectError] = useState<string | null>(null);
    const [dialogError, setDialogError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<string | null>(null);
    const [createDialogContext, setCreateDialogContext] = useState<SubProcessContext | null>(null);
    const [attachDialogContext, setAttachDialogContext] = useState<SubProcessContext | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<ControlStructureNode | null>(null);

    const treeSelectedId = controlAssignmentId ?? selectedId;
    const selectedNode = useMemo(
        () => findControlNodeById(structureNodes, treeSelectedId),
        [structureNodes, treeSelectedId],
    );
    const selectedAssignment = controlAssignmentId
        ? assignmentsById[controlAssignmentId] ?? null
        : null;

    useEffect(() => {
        void refreshStructure().catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("control.errors.loadStructure", {
                        defaultValue: "خطا در بارگذاری ساختار کنترل‌ها",
                    }),
                    t,
                ),
            );
        });
    }, [refreshStructure, t]);

    useEffect(() => {
        if (!controlAssignmentId) {
            return;
        }

        setSelectedId(controlAssignmentId);
        setTreeExpansionAnchorId(controlAssignmentId);
        void loadAssignment(controlAssignmentId).catch((error: unknown) => {
            setObjectError(
                mapError(
                    error,
                    t("control.errors.loadAssignment", {
                        defaultValue: "خطا در بارگذاری جزئیات اتصال کنترل",
                    }),
                    t,
                ),
            );
        });
    }, [controlAssignmentId, loadAssignment, setSelectedId, t]);

    const handleSelect = useCallback(
        (id: string) => {
            const node = findControlNodeById(structureNodes, id);
            setSelectedId(id);
            setTreeExpansionAnchorId(id);
            setPageError(null);
            setObjectError(null);

            if (node?.nodeType === "control") {
                navigate(`/controls/${id}`);
                return;
            }

            if (routeMode !== "list") {
                navigate("/controls");
            }
        },
        [navigate, routeMode, setSelectedId, structureNodes],
    );

    const handleShow = useCallback(
        (id: string) => {
            setSelectedId(id);
            setTreeExpansionAnchorId(id);
            setObjectError(null);
            navigate(`/controls/${id}`);
        },
        [navigate, setSelectedId],
    );

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? controlAssignmentId ?? selectedId;

            if (!targetId) {
                return;
            }

            setSelectedId(targetId);
            setTreeExpansionAnchorId(targetId);
            setObjectError(null);
            navigate(`/controls/${targetId}/edit`);
        },
        [controlAssignmentId, navigate, selectedId, setSelectedId],
    );

    const handleCancelObject = useCallback(() => {
        setObjectError(null);

        if (routeMode === "edit" && controlAssignmentId) {
            navigate(`/controls/${controlAssignmentId}`);
            return;
        }

        setSelectedId(null);
        setTreeExpansionAnchorId(null);
        navigate("/controls");
    }, [controlAssignmentId, navigate, routeMode, setSelectedId]);

    const handleCreateAction = useCallback(
        (action: ControlCreateAction) => {
            const currentSelectedId = controlAssignmentId ?? selectedId;
            const node = findControlNodeById(structureNodes, currentSelectedId);
            const assignment = currentSelectedId ? assignmentsById[currentSelectedId] ?? null : null;
            const context = resolveSubProcessForAction(node, assignment, structureNodes);

            if (!context) {
                setPageError(
                    t("control.errors.selectSubProcess", {
                        defaultValue:
                            "برای تعریف یا اتصال کنترل، ابتدا یک زیر فرآیند یا کنترل زیر آن را انتخاب کنید.",
                    }),
                );
                return;
            }

            setDialogError(null);
            setPageError(null);

            if (action === "createNew") {
                setCreateDialogContext(context);
                return;
            }

            setAttachDialogContext(context);
        },
        [assignmentsById, controlAssignmentId, selectedId, structureNodes, t],
    );

    const handleCreateSubmit = useCallback(
        async (payload: CreateControlAndAssignRequest) => {
            if (!createDialogContext) {
                return;
            }

            try {
                setSubmitting(true);
                setDialogError(null);
                const created = await createAndAssign(createDialogContext.subProcessId, payload);
                setCreateDialogContext(null);
                setSelectedId(created.controlAssignmentId);
                setTreeExpansionAnchorId(created.controlAssignmentId);
                navigate(`/controls/${created.controlAssignmentId}`);
            } catch (error) {
                setDialogError(
                    mapError(
                        error,
                        t("control.errors.save", { defaultValue: "خطا در ذخیره کنترل" }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [createAndAssign, createDialogContext, navigate, setSelectedId, t],
    );

    const handleAttachSubmit = useCallback(
        async (payload: AttachExistingControlRequest) => {
            if (!attachDialogContext) {
                return;
            }

            try {
                setSubmitting(true);
                setDialogError(null);
                const attached = await attachExisting(attachDialogContext.subProcessId, payload);
                setAttachDialogContext(null);
                setSelectedId(attached.controlAssignmentId);
                setTreeExpansionAnchorId(attached.controlAssignmentId);
                navigate(`/controls/${attached.controlAssignmentId}`);
            } catch (error) {
                setDialogError(
                    mapError(
                        error,
                        t("control.errors.save", { defaultValue: "خطا در ذخیره کنترل" }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [attachDialogContext, attachExisting, navigate, setSelectedId, t],
    );

    const handleObjectSubmit = useCallback(
        async (payload: UpdateControlAssignmentRequest) => {
            if (!controlAssignmentId) {
                return;
            }

            try {
                setSubmitting(true);
                setObjectError(null);
                await updateAssignment(controlAssignmentId, payload);
                setSelectedId(controlAssignmentId);
                setTreeExpansionAnchorId(controlAssignmentId);
                navigate(`/controls/${controlAssignmentId}`);
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("control.errors.save", { defaultValue: "خطا در ذخیره کنترل" }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [controlAssignmentId, navigate, setSelectedId, t, updateAssignment],
    );

    const requestDelete = useCallback(
        (id: string) => {
            const node = findControlNodeById(structureNodes, id);

            if (!node || !isControlNode(node)) {
                setPageError(
                    t("control.errors.deleteOnlyAssignment", {
                        defaultValue: "حذف فقط برای اتصال کنترل امکان‌پذیر است.",
                    }),
                );
                return;
            }

            setDeleteCandidate(node);
        },
        [structureNodes, t],
    );

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteCandidate?.controlAssignmentId) {
            return;
        }

        try {
            setSubmitting(true);
            setPageError(null);
            const parentId = deleteCandidate.subProcessId ?? deleteCandidate.parentId ?? null;
            await deleteAssignment(deleteCandidate.controlAssignmentId);
            setDeleteCandidate(null);

            if (parentId) {
                setSelectedId(parentId);
                setTreeExpansionAnchorId(parentId);
            } else {
                setSelectedId(null);
                setTreeExpansionAnchorId(null);
            }

            navigate("/controls");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("control.errors.delete", {
                        defaultValue: "خطا در حذف اتصال کنترل",
                    }),
                    t,
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }, [deleteAssignment, deleteCandidate, navigate, setSelectedId, t]);

    const showObjectPage = Boolean(controlAssignmentId);
    const showMidColumn = Boolean(showObjectPage || selectedNode);
    const fclLayout: FclLayout = showMidColumn ? "TwoColumnsStartExpanded" : "OneColumn";

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

    const frameStyle: CSSProperties = {
        height: "100%",
        minHeight: 0,
        overflow: "auto",
        border: "1px solid var(--sapGroup_ContentBorderColor)",
        background: "var(--sapBackgroundColor)",
        boxSizing: "border-box",
        padding: "1rem",
    };

    const midColumnContent = (() => {
        if (showObjectPage) {
            if (selectedAssignment) {
                return (
                    <ControlObjectPage
                        key={`${routeMode}:${selectedAssignment.controlAssignmentId}`}
                        mode={routeMode === "edit" ? "edit" : "view"}
                        value={selectedAssignment}
                        busy={loading || submitting}
                        error={objectError}
                        onErrorClose={() => setObjectError(null)}
                        onSubmit={handleObjectSubmit}
                        onCancel={handleCancelObject}
                        onEdit={() => handleEdit()}
                    />
                );
            }

            if (objectError) {
                return (
                    <MessageStrip design="Negative" onClose={() => setObjectError(null)}>
                        {objectError}
                    </MessageStrip>
                );
            }

            return (
                <div style={{ display: "grid", placeItems: "center", minHeight: "16rem" }}>
                    <BusyIndicator active />
                </div>
            );
        }

        if (selectedNode) {
            return (
                <ControlContextSummary
                    value={selectedNode}
                    items={structureNodes}
                    busy={loading || submitting}
                />
            );
        }

        return (
            <MessageStrip design="Information" hideCloseButton>
                {t("control.object.selectPrompt", {
                    defaultValue: "یک فرآیند، زیر فرآیند یا کنترل را از فهرست انتخاب کنید.",
                })}
            </MessageStrip>
        );
    })();

    const listColumn = createElement(
        "div",
        {
            slot: "startColumn",
            dir: appDir,
            style: slotContainerStyle,
        },
        <div style={frameStyle}>
            <ControlsListReport
                items={structureNodes}
                selectedId={treeSelectedId}
                selectedItem={selectedNode}
                expansionAnchorId={treeExpansionAnchorId ?? treeSelectedId}
                searchText={searchText}
                busy={loading || submitting}
                error={pageError}
                onErrorClose={() => setPageError(null)}
                onSearchTextChange={setSearchText}
                onCreateAction={handleCreateAction}
                onShow={handleShow}
                onEdit={handleEdit}
                onDelete={requestDelete}
                onSelect={handleSelect}
            />
        </div>,
    );

    const midColumn = showMidColumn
        ? createElement(
            "div",
            {
                slot: "midColumn",
                dir: appDir,
                style: slotContainerStyle,
            },
            <div style={frameStyle}>{midColumnContent}</div>,
        )
        : null;

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
                midColumn,
            )}

            {createDialogContext ? (
                <CreateControlDialog
                    open
                    busy={loading || submitting}
                    error={dialogError}
                    onErrorClose={() => setDialogError(null)}
                    onClose={() => {
                        setCreateDialogContext(null);
                        setDialogError(null);
                    }}
                    onSubmit={handleCreateSubmit}
                />
            ) : null}

            {attachDialogContext ? (
                <AttachControlDialog
                    open
                    busy={loading || submitting}
                    error={dialogError}
                    onErrorClose={() => setDialogError(null)}
                    onClose={() => {
                        setAttachDialogContext(null);
                        setDialogError(null);
                    }}
                    onSubmit={handleAttachSubmit}
                />
            ) : null}

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("control.delete.title", {
                    defaultValue: "حذف اتصال کنترل",
                })}
                message={t("control.delete.confirm", {
                    defaultValue: "آیا از حذف اتصال کنترل «{{title}}» مطمئن هستید؟",
                    title: displayValue(deleteCandidate?.title),
                })}
                confirmText={t("control.actions.deleteAssignment", {
                    defaultValue: "حذف اتصال کنترل",
                })}
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
