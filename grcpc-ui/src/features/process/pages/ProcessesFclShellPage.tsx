import {
    createElement,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import { BusyIndicator, Dialog, MessageStrip } from "@ui5/webcomponents-react";

import type { ProcessNode, ProcessNodeCreate, ProcessNodeType, ProcessNodeUpdate } from "../domain/process.model";
import { ROOT_PARENT, useProcessState } from "../state/process.state";
import {
    canCreateChild,
    defaultChildType,
    hasChildren,
    sortProcesses,
} from "../utils/process.tree";

import ProcessSummaryPanel from "../components/ProcessSummaryPanel";
import ProcessesListReport from "./ProcessesListReport";
import ProcessObjectPage from "./ProcessObjectPage";
import type {
    ControlDetails,
    ControlStructureNode,
    CreateControlAndAssignRequest,
    UpdateControlAssignmentRequest,
} from "@/features/control/domain/control.model";
import { useControlState } from "@/features/control/state/control.state";
import ControlObjectPage, { type ControlObjectMode } from "@/features/control/pages/ControlObjectPage";
import CreateControlDialog from "@/features/control/pages/CreateControlDialog";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import {
    countSubProcessControls,
    findProcessControlItemById,
    hasAttachedControlsInScope,
    sortProcessControlItems,
    toProcessControlTreeItem,
    type ProcessControlTreeItem,
} from "../utils/process-control.tree";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";
type ControlObjectErrorState = {
    controlAssignmentId: string;
    message: string;
};

const DIALOG_WIDTH = "90vw";

function useProcessRouteMode(): RouteMode {
    const { processId, controlAssignmentId } = useParams();
    const location = useLocation();

    if (location.pathname.endsWith("/new")) {
        return "create";
    }

    if ((processId || controlAssignmentId) && location.pathname.endsWith("/edit")) {
        return "edit";
    }

    if (processId || controlAssignmentId) {
        return "view";
    }

    return "list";
}

function isProcessNodeType(value: string | null): value is ProcessNodeType {
    return value === "process" || value === "subProcess";
}

function mapError(
    error: unknown,
    fallback: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
                return t("process.errors.notFound", { defaultValue: "Ø¢ÛŒØªÙ… Ù…ÙˆØ±Ø¯Ù†Ø¸Ø± ÛŒØ§ÙØª Ù†Ø´Ø¯" });
            case "PARENT_NOT_FOUND":
                return t("process.errors.parentNotFound", { defaultValue: "ÙˆØ§Ù„Ø¯ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ ÛŒØ§ÙØª Ù†Ø´Ø¯" });
            case "HAS_CHILDREN":
                return t("process.errors.hasChildren", {
                    defaultValue: "Ø§Ù…Ú©Ø§Ù† Ø­Ø°Ù Ø¢ÛŒØªÙ…ÛŒ Ú©Ù‡ Ø²ÛŒØ±Ù…Ø¬Ù…ÙˆØ¹Ù‡ Ø¯Ø§Ø±Ø¯ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯",
                });
            case "INVALID_HIERARCHY":
                return t("process.errors.invalidHierarchy", {
                    defaultValue: "Ø³Ø§Ø®ØªØ§Ø± Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ ÙØ±Ø¢ÛŒÙ†Ø¯ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª",
                });
            default:
                return error.message;
        }
    }

    return fallback;
}

function mapControlError(
    error: unknown,
    fallback: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
            case "CONTROL_ASSIGNMENT_NOT_FOUND":
                return t("control.errors.notFound", {
                    defaultValue: "Ø§ØªØµØ§Ù„ Ú©Ù†ØªØ±Ù„ Ù…ÙˆØ±Ø¯Ù†Ø¸Ø± ÛŒØ§ÙØª Ù†Ø´Ø¯",
                });
            case "CONTROL_NOT_FOUND":
                return t("control.errors.controlNotFound", {
                    defaultValue: "Ú©Ù†ØªØ±Ù„ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ ÛŒØ§ÙØª Ù†Ø´Ø¯",
                });
            case "SUB_PROCESS_NOT_FOUND":
                return t("control.errors.subProcessNotFound", {
                    defaultValue: "Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ ÛŒØ§ÙØª Ù†Ø´Ø¯",
                });
            case "DUPLICATE_ACTIVE_ASSIGNMENT":
                return t("control.errors.duplicateActiveAssignment", {
                    defaultValue: "Ø§ÛŒÙ† Ú©Ù†ØªØ±Ù„ Ù‚Ø¨Ù„Ø§Ù‹ Ø¨Ù‡â€ŒØµÙˆØ±Øª ÙØ¹Ø§Ù„ Ø¨Ù‡ Ø§ÛŒÙ† Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯ Ù…ØªØµÙ„ Ø´Ø¯Ù‡ Ø§Ø³Øª",
                });
            default:
                return error.message;
        }
    }

    return fallback;
}

interface SubProcessContext {
    subProcessId: string;
    subProcessTitle?: string | null;
}

function toControlTreeItem(node: ControlStructureNode): ProcessControlTreeItem | null {
    if (node.nodeType !== "control" || !node.controlAssignmentId) {
        return null;
    }

    return {
        id: node.controlAssignmentId,
        code: node.code,
        title: node.title,
        nodeType: "control",
        parentId: node.subProcessId ?? node.parentId,
        status: node.status,
        sortOrder: node.sortOrder,
        description: node.description,
        controlId: node.controlId,
        controlAssignmentId: node.controlAssignmentId,
        subProcessId: node.subProcessId ?? node.parentId,
    };
}

function resolveSubProcessForControlAction(
    selectedItem: ProcessControlTreeItem | null,
    selectedAssignment: ControlDetails | null,
    items: ProcessControlTreeItem[],
): SubProcessContext | null {
    if (!selectedItem) {
        return null;
    }

    if (selectedItem.nodeType === "subProcess") {
        return {
            subProcessId: selectedItem.id,
            subProcessTitle: selectedItem.title,
        };
    }

    if (selectedItem.nodeType !== "control") {
        return null;
    }

    if (selectedAssignment?.parentSubProcessId) {
        return {
            subProcessId: selectedAssignment.parentSubProcessId,
            subProcessTitle: selectedAssignment.parentSubProcessTitle,
        };
    }

    const subProcessId = selectedItem.subProcessId ?? selectedItem.parentId;
    const parentItem = findProcessControlItemById(items, subProcessId);

    if (subProcessId) {
        return {
            subProcessId,
            subProcessTitle: parentItem?.title,
        };
    }

    return null;
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
        return t("process.create.title", { defaultValue: "Ø§ÛŒØ¬Ø§Ø¯ Ø¢ÛŒØªÙ… ÙØ±Ø¢ÛŒÙ†Ø¯ÛŒ" });
    }

    if (routeMode === "edit") {
        return t("process.edit.title", { defaultValue: "ÙˆÛŒØ±Ø§ÛŒØ´ Ø¢ÛŒØªÙ… ÙØ±Ø¢ÛŒÙ†Ø¯ÛŒ" });
    }

    if (routeMode === "view") {
        return t("process.view.title", { defaultValue: "Ù†Ù…Ø§ÛŒØ´ Ø¢ÛŒØªÙ… ÙØ±Ø¢ÛŒÙ†Ø¯ÛŒ" });
    }

    return "";
}

const CREATE_NODE_TYPES: ProcessNodeType[] = ["process", "subProcess"];

function findNearestAncestorOfType(
    start: ProcessNode | null,
    nodeType: ProcessNodeType,
    nodesById: Record<string, ProcessNode>,
): ProcessNode | null {
    const visited = new Set<string>();
    let current: ProcessNode | null | undefined = start;

    while (current) {
        if (current.nodeType === nodeType) {
            return current;
        }

        if (!current.parentId || visited.has(current.parentId)) {
            return null;
        }

        visited.add(current.parentId);
        current = nodesById[current.parentId];
    }

    return null;
}

function resolveCreateParentId(
    nodeType: ProcessNodeType,
    selectedItem: ProcessNode | null,
    nodesById: Record<string, ProcessNode>,
): string | null | undefined {
    if (nodeType === "process") {
        const nearestProcess = findNearestAncestorOfType(selectedItem, "process", nodesById);
        return nearestProcess?.id ?? null;
    }

    if (nodeType === "subProcess") {
        const nearestProcess = findNearestAncestorOfType(selectedItem, "process", nodesById);
        return nearestProcess?.id;
    }

    return undefined;
}

function resolveInvalidCreateMessage(
    nodeType: ProcessNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (nodeType === "subProcess") {
        return t("process.errors.selectProcessParent", {
            defaultValue: "Ø¨Ø±Ø§ÛŒ Ø§ÛŒØ¬Ø§Ø¯ Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯ØŒ Ø§Ø¨ØªØ¯Ø§ ÛŒÚ© ÙØ±Ø¢ÛŒÙ†Ø¯ ÛŒØ§ Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯ Ù‡Ù…Ø§Ù† ÙˆØ§Ù„Ø¯ Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯.",
        });
    }

    return t("process.errors.invalidHierarchy", {
        defaultValue: "Ø³Ø§Ø®ØªØ§Ø± Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ ÙØ±Ø¢ÛŒÙ†Ø¯ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª",
    });
}

export default function ProcessesFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { processId, controlAssignmentId } = useParams();

    const routeMode = useProcessRouteMode();
    const isControlRoute = Boolean(controlAssignmentId);
    const appDir = useResolvedUiDir();
    const nodesById = useProcessState((state) => state.nodesById);
    const loading = useProcessState((state) => state.loading);
    const loadChildren = useProcessState((state) => state.loadChildren);
    const createNode = useProcessState((state) => state.createNode);
    const updateNode = useProcessState((state) => state.updateNode);
    const removeNode = useProcessState((state) => state.removeNode);

    const controlStructureNodes = useControlState((state) => state.structureNodes);
    const controlAssignmentsById = useControlState((state) => state.assignmentsById);
    const controlLoading = useControlState((state) => state.loading);
    const refreshControlStructure = useControlState((state) => state.refreshStructure);
    const loadControlAssignment = useControlState((state) => state.loadAssignment);
    const createAndAssignControl = useControlState((state) => state.createAndAssign);
    const updateControlAssignment = useControlState((state) => state.updateAssignment);
    const deleteControlAssignment = useControlState((state) => state.deleteAssignment);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [objectError, setObjectError] = useState<string | null>(null);
    const [controlObjectError, setControlObjectError] =
        useState<ControlObjectErrorState | null>(null);
    const [controlDialogError, setControlDialogError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<ProcessNode | null>(null);
    const [deleteControlCandidate, setDeleteControlCandidate] = useState<ProcessControlTreeItem | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
    const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<string | null>(null);
    const [createControlContext, setCreateControlContext] = useState<SubProcessContext | null>(null);
    const [controlModalAssignmentId, setControlModalAssignmentId] = useState<string | null>(null);
    const [controlModalMode, setControlModalMode] = useState<ControlObjectMode>("view");
    const [controlModalError, setControlModalError] = useState<string | null>(null);
    const [controlObjectLoadedId, setControlObjectLoadedId] = useState<string | null>(null);
    const controlObjectRequestSeq = useRef(0);

    const processItems = useMemo(() => sortProcesses(Object.values(nodesById)), [nodesById]);
    const combinedTreeItems = useMemo(() => {
        const processTreeItems = processItems.map(toProcessControlTreeItem);
        const controlTreeItems = controlStructureNodes
            .map(toControlTreeItem)
            .filter((item): item is ProcessControlTreeItem => item !== null);

        return sortProcessControlItems([...processTreeItems, ...controlTreeItems]);
    }, [controlStructureNodes, processItems]);

    const selectedRouteItem = processId ? nodesById[processId] ?? null : null;
    const selectedTreeItem = selectedTreeId ? nodesById[selectedTreeId] ?? null : null;

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const queryParentId = queryParams.get("parentId");
    const queryNodeType = queryParams.get("nodeType");

    const selectedParentForCreate = queryParentId ? nodesById[queryParentId] ?? null : null;

    const requestedNodeType = useMemo<ProcessNodeType>(() => {
        if (isProcessNodeType(queryNodeType)) {
            return queryNodeType;
        }

        return defaultChildType(selectedParentForCreate?.nodeType ?? null);
    }, [queryNodeType, selectedParentForCreate]);

    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("process.errors.loadList", {
                        defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø³Ø§Ø®ØªØ§Ø± ÙØ±Ø¢ÛŒÙ†Ø¯",
                    }),
                    t,
                ),
            );
        });
    }, [loadChildren, t]);

    useEffect(() => {
        void refreshControlStructure().catch((error: unknown) => {
            setPageError(
                mapControlError(
                    error,
                    t("control.errors.loadStructure", {
                        defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø³Ø§Ø®ØªØ§Ø± Ú©Ù†ØªØ±Ù„â€ŒÙ‡Ø§",
                    }),
                    t,
                ),
            );
        });
    }, [refreshControlStructure, t]);

    useEffect(() => {
        if (!controlAssignmentId) {
            return;
        }

        const requestId = controlObjectRequestSeq.current + 1;
        controlObjectRequestSeq.current = requestId;

        void loadControlAssignment(controlAssignmentId)
            .then(() => {
                if (controlObjectRequestSeq.current === requestId) {
                    setControlObjectLoadedId(controlAssignmentId);
                    setControlObjectError(null);
                }
            })
            .catch((error: unknown) => {
                if (controlObjectRequestSeq.current !== requestId) {
                    return;
                }

                setControlObjectError({
                    controlAssignmentId,
                    message: mapControlError(
                        error,
                        t("control.errors.loadAssignment", {
                            defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø¬Ø²Ø¦ÛŒØ§Øª Ø§ØªØµØ§Ù„ Ú©Ù†ØªØ±Ù„",
                        }),
                        t,
                    ),
                });
            });

        return () => {
            if (controlObjectRequestSeq.current === requestId) {
                controlObjectRequestSeq.current += 1;
            }
        };
    }, [controlAssignmentId, loadControlAssignment, t]);

    const treeSelectedId = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId;
        }

        if (isControlRoute) {
            return controlAssignmentId ?? selectedTreeId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return processId ?? selectedTreeId;
        }

        return selectedTreeId;
    }, [controlAssignmentId, isControlRoute, processId, queryParentId, routeMode, selectedTreeId]);

    const selectedCombinedItem = useMemo(
        () => findProcessControlItemById(combinedTreeItems, treeSelectedId),
        [combinedTreeItems, treeSelectedId],
    );
    const selectedControlAssignment = controlAssignmentId
        ? controlAssignmentsById[controlAssignmentId] ?? null
        : null;
    const selectedControlAssignmentReady =
        Boolean(selectedControlAssignment) &&
        selectedControlAssignment?.controlAssignmentId === controlAssignmentId &&
        controlObjectLoadedId === controlAssignmentId;
    const selectedControlObjectError =
        controlObjectError && controlObjectError.controlAssignmentId === controlAssignmentId
            ? controlObjectError.message
            : null;
    const controlModalAssignment = controlModalAssignmentId
        ? controlAssignmentsById[controlModalAssignmentId] ?? null
        : null;

    const treeExpansionAnchorIdValue = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        if (isControlRoute) {
            return controlAssignmentId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return processId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        return selectedTreeId ?? treeExpansionAnchorId;
    }, [
        controlAssignmentId,
        isControlRoute,
        processId,
        queryParentId,
        routeMode,
        selectedTreeId,
        treeExpansionAnchorId,
    ]);

    const handleSelect = useCallback(
        (id: string) => {
            const selectedItem = findProcessControlItemById(combinedTreeItems, id);
            setSelectedTreeId(id);
            setTreeExpansionAnchorId(id);
            setPageError(null);
            setControlObjectError(null);

            if (selectedItem?.nodeType === "control") {
                navigate(`/processes/control-assignments/${id}`);
                return;
            }

            if (isControlRoute) {
                navigate("/processes");
            }
        },
        [combinedTreeItems, isControlRoute, navigate],
    );

    const handleOpenControlAssignment = useCallback(
        async (targetControlAssignmentId: string) => {
            setControlModalAssignmentId(targetControlAssignmentId);
            setControlModalMode("view");
            setControlModalError(null);

            try {
                await loadControlAssignment(targetControlAssignmentId);
            } catch (error) {
                setControlModalError(
                    mapControlError(
                        error,
                        t("control.errors.loadAssignment", {
                            defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø¬Ø²Ø¦ÛŒØ§Øª Ø§ØªØµØ§Ù„ Ú©Ù†ØªØ±Ù„",
                        }),
                        t,
                    ),
                );
            }
        },
        [loadControlAssignment, t],
    );

    const handleShow = useCallback(
        (id: string) => {
            const selectedItem = findProcessControlItemById(combinedTreeItems, id);
            setObjectError(null);
            setControlObjectError(null);
            setSelectedTreeId(id);
            setTreeExpansionAnchorId(id);

            if (selectedItem?.nodeType === "control") {
                void handleOpenControlAssignment(selectedItem.controlAssignmentId ?? selectedItem.id);
                return;
            }

            navigate(`/processes/${id}`);
        },
        [combinedTreeItems, handleOpenControlAssignment, navigate],
    );

    const handleCreate = useCallback(
        (nodeType: ProcessNodeType) => {
            const selectedId = selectedTreeId ?? processId ?? controlAssignmentId ?? null;
            const selectedCombined = findProcessControlItemById(combinedTreeItems, selectedId);

            if (selectedCombined?.nodeType === "control") {
                setPageError(
                    t("process.errors.createFromControlSelection", {
                        defaultValue:
                            "Ø¨Ø±Ø§ÛŒ Ø§ÛŒØ¬Ø§Ø¯ ÙØ±Ø¢ÛŒÙ†Ø¯ ÛŒØ§ Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯ØŒ Ø§Ø¨ØªØ¯Ø§ ÛŒÚ© Ø¢ÛŒØªÙ… ÙØ±Ø¢ÛŒÙ†Ø¯ÛŒ Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯Ø› Ú©Ù†ØªØ±Ù„ ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ø¹Ù…Ù„ÛŒØ§Øª Ú©Ù†ØªØ±Ù„ Ù‚Ø§Ø¨Ù„ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø§Ø³Øª.",
                    }),
                );
                return;
            }

            const selectedProcessItem = selectedId ? nodesById[selectedId] ?? null : null;
            const parentId = resolveCreateParentId(nodeType, selectedProcessItem, nodesById);
            const parent = parentId ? nodesById[parentId] ?? null : null;

            if (parentId === undefined || !canCreateChild(parent?.nodeType ?? null, nodeType)) {
                setPageError(resolveInvalidCreateMessage(nodeType, t));
                return;
            }

            setObjectError(null);
            const params = new URLSearchParams();

            if (parentId) {
                params.set("parentId", parentId);
            }

            params.set("nodeType", nodeType);
            setTreeExpansionAnchorId(parentId);
            navigate(`/processes/new?${params.toString()}`);
        },
        [combinedTreeItems, controlAssignmentId, navigate, nodesById, processId, selectedTreeId, t],
    );

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? processId ?? selectedTreeId;

            if (!targetId) {
                return;
            }

            setObjectError(null);
            setSelectedTreeId(targetId);
            setTreeExpansionAnchorId(targetId);
            navigate(`/processes/${targetId}/edit`);
        },
        [navigate, processId, selectedTreeId],
    );

    const handleCancel = useCallback(() => {
        setObjectError(null);

        const currentAnchorId =
            routeMode === "create" ? queryParentId ?? selectedTreeId : processId ?? selectedTreeId;

        if (currentAnchorId) {
            setSelectedTreeId(currentAnchorId);
            setTreeExpansionAnchorId(currentAnchorId);
        }

        navigate("/processes");
    }, [navigate, processId, queryParentId, routeMode, selectedTreeId]);

    const requestDelete = useCallback(
        (id: string) => {
            const selectedItem = findProcessControlItemById(combinedTreeItems, id);

            if (selectedItem?.nodeType === "control") {
                setDeleteControlCandidate(selectedItem);
                return;
            }

            const target = nodesById[id];

            if (!target) {
                setPageError(
                    t("process.errors.notFound", { defaultValue: "Ø¢ÛŒØªÙ… Ù…ÙˆØ±Ø¯Ù†Ø¸Ø± ÛŒØ§ÙØª Ù†Ø´Ø¯" }),
                );
                return;
            }

            if (selectedItem && hasAttachedControlsInScope(combinedTreeItems, selectedItem)) {
                setPageError(
                    t("process.errors.hasAttachedControls", {
                        defaultValue: "Ø§ÛŒÙ† Ø¢ÛŒØªÙ… Ø¯Ø§Ø±Ø§ÛŒ Ú©Ù†ØªØ±Ù„ Ù…ØªØµÙ„ Ø§Ø³Øª Ùˆ Ù‚Ø§Ø¨Ù„ Ø­Ø°Ù Ù†ÛŒØ³Øª.",
                    }),
                );
                return;
            }

            if (hasChildren(processItems, id)) {
                setPageError(
                    t("process.errors.hasChildren", {
                        defaultValue: "Ø§Ù…Ú©Ø§Ù† Ø­Ø°Ù Ø¢ÛŒØªÙ…ÛŒ Ú©Ù‡ Ø²ÛŒØ±Ù…Ø¬Ù…ÙˆØ¹Ù‡ Ø¯Ø§Ø±Ø¯ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯",
                    }),
                );
                return;
            }

            setDeleteCandidate(target);
        },
        [combinedTreeItems, nodesById, processItems, t],
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

            if (parentId) {
                setSelectedTreeId(parentId);
                setTreeExpansionAnchorId(parentId);
                navigate("/processes");
                return;
            }

            setSelectedTreeId(null);
            setTreeExpansionAnchorId(null);
            navigate("/processes");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("process.errors.delete", {
                        defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø­Ø°Ù Ø¢ÛŒØªÙ… ÙØ±Ø¢ÛŒÙ†Ø¯ÛŒ",
                    }),
                    t,
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }, [deleteCandidate, navigate, removeNode, t]);

    const handleConfirmControlDelete = useCallback(async () => {
        if (!deleteControlCandidate?.controlAssignmentId) {
            return;
        }

        try {
            setSubmitting(true);
            setPageError(null);

            const parentId =
                deleteControlCandidate.subProcessId ?? deleteControlCandidate.parentId ?? null;
            await deleteControlAssignment(deleteControlCandidate.controlAssignmentId);
            setDeleteControlCandidate(null);

            if (parentId) {
                setSelectedTreeId(parentId);
                setTreeExpansionAnchorId(parentId);
            } else {
                setSelectedTreeId(null);
                setTreeExpansionAnchorId(null);
            }

            navigate("/processes");
        } catch (error) {
            setPageError(
                mapControlError(
                    error,
                    t("control.errors.delete", {
                        defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø­Ø°Ù Ø§ØªØµØ§Ù„ Ú©Ù†ØªØ±Ù„",
                    }),
                    t,
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }, [deleteControlAssignment, deleteControlCandidate, navigate, t]);

    const handleObjectSubmit = useCallback(
        async (payload: ProcessNodeCreate | ProcessNodeUpdate) => {
            try {
                setSubmitting(true);
                setPageError(null);
                setObjectError(null);

                if (routeMode === "create") {
                    const createPayload = payload as ProcessNodeCreate;
                    const created = await createNode(createPayload.parentId ?? null, createPayload);

                    setSelectedTreeId(created.id);
                    setTreeExpansionAnchorId(created.id);
                    navigate(`/processes/${created.id}`);
                    return;
                }

                if (routeMode === "edit" && processId) {
                    await updateNode(processId, payload as ProcessNodeUpdate);
                    setSelectedTreeId(processId);
                    setTreeExpansionAnchorId(processId);
                    navigate(`/processes/${processId}`);
                }
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("process.errors.save", {
                            defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ø¢ÛŒØªÙ… ÙØ±Ø¢ÛŒÙ†Ø¯ÛŒ",
                        }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [
            createNode,
            navigate,
            processId,
            routeMode,
            t,
            updateNode,
        ],
    );

    const handleCreateControl = useCallback(
        () => {
            const currentSelectedItem = selectedCombinedItem;
            const currentAssignment = currentSelectedItem?.nodeType === "control"
                ? selectedControlAssignment
                : null;
            const context = resolveSubProcessForControlAction(
                currentSelectedItem,
                currentAssignment,
                combinedTreeItems,
            );

            if (!context) {
                setPageError(
                    t("control.errors.selectSubProcessForCreate", {
                        defaultValue:
                            "Ø¨Ø±Ø§ÛŒ Ø§ÛŒØ¬Ø§Ø¯ Ú©Ù†ØªØ±Ù„ØŒ Ø§Ø¨ØªØ¯Ø§ ÛŒÚ© Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯ ÛŒØ§ Ú©Ù†ØªØ±Ù„ Ø²ÛŒØ± Ø¢Ù† Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯.",
                    }),
                );
                return;
            }

            setPageError(null);
            setControlDialogError(null);
            setCreateControlContext(context);
        },
        [combinedTreeItems, selectedCombinedItem, selectedControlAssignment, t],
    );

    const handleCreateControlSubmit = useCallback(
        async (payload: CreateControlAndAssignRequest) => {
            if (!createControlContext) {
                return;
            }

            try {
                setSubmitting(true);
                setControlDialogError(null);
                const created = await createAndAssignControl(
                    createControlContext.subProcessId,
                    payload,
                );
                setCreateControlContext(null);
                setSelectedTreeId(created.controlAssignmentId);
                setTreeExpansionAnchorId(created.controlAssignmentId);
                navigate(`/processes/control-assignments/${created.controlAssignmentId}`);
            } catch (error) {
                setControlDialogError(
                    mapControlError(
                        error,
                        t("control.errors.save", { defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ØªØ±Ù„" }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [createAndAssignControl, createControlContext, navigate, t],
    );

    const handleControlObjectSubmit = useCallback(
        async (payload: UpdateControlAssignmentRequest) => {
            if (!controlAssignmentId) {
                return;
            }

            try {
                setSubmitting(true);
                setControlObjectError(null);
                await updateControlAssignment(controlAssignmentId, payload);
                await Promise.all([
                    loadControlAssignment(controlAssignmentId),
                    refreshControlStructure(),
                ]);
                setSelectedTreeId(controlAssignmentId);
                setTreeExpansionAnchorId(controlAssignmentId);
                navigate(`/processes/control-assignments/${controlAssignmentId}`);
            } catch (error) {
                setControlObjectError({
                    controlAssignmentId,
                    message: mapControlError(
                        error,
                        t("control.errors.save", { defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ØªØ±Ù„" }),
                        t,
                    ),
                });
            } finally {
                setSubmitting(false);
            }
        },
        [
            controlAssignmentId,
            loadControlAssignment,
            navigate,
            refreshControlStructure,
            t,
            updateControlAssignment,
        ],
    );

    const handleCloseControlDetailsPanel = useCallback(() => {
        setControlObjectError(null);
        setControlObjectLoadedId(null);
        setSelectedTreeId(null);
        setTreeExpansionAnchorId(null);
        navigate("/processes");
    }, [navigate]);

    const handleControlModalClose = useCallback(() => {
        setControlModalAssignmentId(null);
        setControlModalMode("view");
        setControlModalError(null);
    }, []);

    const handleControlModalEdit = useCallback(() => {
        setControlModalError(null);
        setControlModalMode("edit");
    }, []);

    const handleControlModalSubmit = useCallback(
        async (payload: UpdateControlAssignmentRequest) => {
            if (!controlModalAssignmentId) {
                return;
            }

            try {
                setSubmitting(true);
                setControlModalError(null);
                await updateControlAssignment(controlModalAssignmentId, payload);
                await Promise.all([
                    loadControlAssignment(controlModalAssignmentId),
                    refreshControlStructure(),
                ]);
                setControlModalMode("view");
            } catch (error) {
                setControlModalError(
                    mapControlError(
                        error,
                        t("control.errors.save", { defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ØªØ±Ù„" }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [
            controlModalAssignmentId,
            loadControlAssignment,
            refreshControlStructure,
            t,
            updateControlAssignment,
        ],
    );

    const handleControlModalCancel = useCallback(() => {
        if (controlModalMode === "edit") {
            setControlModalError(null);
            setControlModalMode("view");

            if (controlModalAssignmentId) {
                void loadControlAssignment(controlModalAssignmentId).catch((error: unknown) => {
                    setControlModalError(
                        mapControlError(
                            error,
                            t("control.errors.loadAssignment", {
                                defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø¬Ø²Ø¦ÛŒØ§Øª Ø§ØªØµØ§Ù„ Ú©Ù†ØªØ±Ù„",
                            }),
                            t,
                        ),
                    );
                });
            }

            return;
        }

        handleControlModalClose();
    }, [
        controlModalAssignmentId,
        controlModalMode,
        handleControlModalClose,
        loadControlAssignment,
        t,
    ]);

    const handleControlStructureChanged = useCallback(async () => {
        try {
            await refreshControlStructure();
        } catch (error) {
            setPageError(
                mapControlError(
                    error,
                    t("control.errors.loadStructure", {
                        defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø³Ø§Ø®ØªØ§Ø± Ú©Ù†ØªØ±Ù„â€ŒÙ‡Ø§",
                    }),
                    t,
                ),
            );
        }
    }, [refreshControlStructure, t]);

    const showModal =
        !isControlRoute && (routeMode === "create" || routeMode === "view" || routeMode === "edit");

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
        routeMode === "create" ? "create" : routeMode === "edit" ? "edit" : "view";

    const objectValue = routeMode === "create" || isControlRoute ? null : selectedRouteItem;

    const showControlObjectPane = Boolean(controlAssignmentId);
    const showProcessSummaryPane = Boolean(selectedTreeItem && !showControlObjectPane);
    const showMidColumn = showControlObjectPane || showProcessSummaryPane;
    const fclLayout: FclLayout = showMidColumn ? "TwoColumnsStartExpanded" : "OneColumn";
    const selectedSubProcessControlsCount = selectedTreeItem?.nodeType === "subProcess"
        ? countSubProcessControls(combinedTreeItems, selectedTreeItem.id)
        : undefined;
    const createOptions = CREATE_NODE_TYPES;

    const slotContainerStyle = useMemo<CSSProperties>(
        () => ({
            height: "100%",
            minWidth: 0,
            maxWidth: "100%",
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
        minWidth: 0,
        maxWidth: "100%",
        overflow: "auto",
        border: "1px solid var(--sapGroup_ContentBorderColor)",
        borderRadius: "0",
        background: "var(--sapBackgroundColor)",
        boxSizing: "border-box",
        padding: "1rem",
    };

    const dialogContentStyle = useMemo<CSSProperties>(
        () => ({
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            maxHeight: "calc(92vh - 8rem)",
            overflow: "auto",
            direction: appDir,
            boxSizing: "border-box",
            padding: "0.25rem",
        }),
        [appDir],
    );

    const dialogStyle = useMemo<CSSProperties>(() => {
        const width = DIALOG_WIDTH;

        return {
            width,
            maxWidth: width,
        };
    }, []);

    const listColumn = createElement(
        "div",
        {
            slot: "startColumn",
            dir: appDir,
            style: slotContainerStyle,
        },
        <div style={frameStyle}>
            <ProcessesListReport
                items={combinedTreeItems}
                selectedItem={selectedCombinedItem}
                selectedId={treeSelectedId}
                expansionAnchorId={treeExpansionAnchorIdValue}
                searchText={searchText}
                busy={loading || controlLoading || submitting}
                error={!showModal ? pageError : null}
                onErrorClose={() => setPageError(null)}
                createOptions={createOptions}
                onSearchTextChange={setSearchText}
                onCreate={handleCreate}
                onCreateControl={handleCreateControl}
                onShow={handleShow}
                onDelete={requestDelete}
                onSelect={handleSelect}
            />
        </div>,
    );

    const midColumnContent = (() => {
        if (showControlObjectPane) {
            if (selectedControlAssignmentReady && selectedControlAssignment) {
                return (
                    <ControlObjectPage
                        key={selectedControlAssignment.controlAssignmentId}
                        mode={routeMode === "edit" ? "edit" : "view"}
                        presentation="panel"
                        value={selectedControlAssignment}
                        busy={controlLoading || submitting}
                        error={selectedControlObjectError}
                        onErrorClose={() => setControlObjectError(null)}
                        onSubmit={handleControlObjectSubmit}
                        onCancel={handleCloseControlDetailsPanel}
                    />
                );
            }

            if (selectedControlObjectError) {
                return (
                    <MessageStrip design="Negative" hideCloseButton>
                        {selectedControlObjectError}
                    </MessageStrip>
                );
            }

            return (
                <div style={{ display: "grid", placeItems: "center", minHeight: "12rem" }}>
                    <BusyIndicator active delay={0} />
                </div>
            );
        }

        if (selectedTreeItem) {
            return (
                <ProcessSummaryPanel
                    value={selectedTreeItem}
                    controlsCount={selectedSubProcessControlsCount}
                    busy={loading || controlLoading || submitting}
                    error={!showModal ? pageError : null}
                    onErrorClose={() => setPageError(null)}
                    onClose={() => {
                        setSelectedTreeId(null);
                        setTreeExpansionAnchorId(null);
                    }}
                />
            );
        }

        return null;
    })();

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

    const dialogTitle = resolveDialogTitle(routeMode, t);
    const controlModalTitle = t("control.object.viewTitle", {
        defaultValue: "Ù†Ù…Ø§ÛŒØ´ Ú©Ù†ØªØ±Ù„",
    });

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

            <Dialog
                open={showModal}
                accessibleName={dialogTitle}
                className="processObjectDialog"
                style={dialogStyle}
                onClose={handleObjectDialogClose}
            >
                <ModalDialogHeader title={dialogTitle} onClose={handleObjectDialogClose} />
                <div style={dialogContentStyle}>
                    {objectMode === "create" || objectValue ? (
                        <ProcessObjectPage
                            key={`${objectValue?.id ?? "new"}:${queryParentId ?? "root"}:${requestedNodeType}`}
                            mode={objectMode}
                            allItems={processItems}
                            value={objectValue}
                            parent={selectedParentForCreate}
                            requestedNodeType={requestedNodeType}
                            busy={loading || submitting}
                            error={objectError}
                            onErrorClose={() => setObjectError(null)}
                            onSubmit={handleObjectSubmit}
                            onCancel={handleCancel}
                            onEdit={() => handleEdit()}
                            onOpenControlAssignment={handleOpenControlAssignment}
                            onControlStructureChanged={handleControlStructureChanged}
                        />
                    ) : (
                        <MessageStrip design="Information" hideCloseButton>
                            {t("process.object.notFound", {
                                defaultValue: "Ø¢ÛŒØªÙ… ÙØ±Ø¢ÛŒÙ†Ø¯ÛŒ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ ÛŒØ§ÙØª Ù†Ø´Ø¯.",
                            })}
                        </MessageStrip>
                    )}
                </div>
            </Dialog>

            {controlModalAssignmentId ? (
                <Dialog
                    open
                    accessibleName={controlModalTitle}
                    className="processControlObjectDialog"
                    style={dialogStyle}
                    onClose={handleControlModalClose}
                >
                    <ModalDialogHeader
                        title={controlModalTitle}
                        onClose={handleControlModalClose}
                    />
                    <div style={dialogContentStyle}>
                        {controlModalAssignment ? (
                            <ControlObjectPage
                                key={`modal:${controlModalAssignment.controlAssignmentId}`}
                                mode={controlModalMode}
                                value={controlModalAssignment}
                                busy={controlLoading || submitting}
                                error={controlModalError}
                                onErrorClose={() => setControlModalError(null)}
                                onSubmit={handleControlModalSubmit}
                                onCancel={handleControlModalCancel}
                                onEdit={handleControlModalEdit}
                            />
                        ) : controlModalError ? (
                            <MessageStrip design="Negative" onClose={() => setControlModalError(null)}>
                                {controlModalError}
                            </MessageStrip>
                        ) : (
                            <MessageStrip design="Information" hideCloseButton>
                                {t("control.object.loading", {
                                    defaultValue: "Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ú©Ù†ØªØ±Ù„...",
                                })}
                            </MessageStrip>
                        )}
                    </div>
                </Dialog>
            ) : null}

            {createControlContext ? (
                <CreateControlDialog
                    open
                    busy={controlLoading || submitting}
                    error={controlDialogError}
                    subProcessId={createControlContext.subProcessId}
                    subProcessTitle={createControlContext.subProcessTitle}
                    onErrorClose={() => setControlDialogError(null)}
                    onClose={() => {
                        setCreateControlContext(null);
                        setControlDialogError(null);
                    }}
                    onSubmit={handleCreateControlSubmit}
                />
            ) : null}

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("process.delete.title", { defaultValue: "Ø­Ø°Ù Ø¢ÛŒØªÙ… ÙØ±Ø¢ÛŒÙ†Ø¯ÛŒ" })}
                message={t("process.delete.confirm", {
                    defaultValue: "Ø¢ÛŒØ§ Ø§Ø² Ø­Ø°Ù \"{{title}}\" Ù…Ø·Ù…Ø¦Ù† Ù‡Ø³ØªÛŒØ¯ØŸ",
                    title: deleteCandidate?.title ?? "",
                })}
                confirmText={t("common.delete", { defaultValue: "Ø­Ø°Ù" })}
                cancelText={t("common.cancel", { defaultValue: "Ø§Ù†ØµØ±Ø§Ù" })}
                loading={submitting}
                onClose={() => setDeleteCandidate(null)}
                onConfirm={() => {
                    void handleConfirmDelete();
                }}
            />

            <DeleteConfirmDialog
                open={Boolean(deleteControlCandidate)}
                title={t("control.delete.title", {
                    defaultValue: "Ø­Ø°Ù Ø§ØªØµØ§Ù„ Ú©Ù†ØªØ±Ù„",
                })}
                message={t("control.delete.confirm", {
                    defaultValue: "Ø¢ÛŒØ§ Ø§Ø² Ø­Ø°Ù Ø§ØªØµØ§Ù„ Ú©Ù†ØªØ±Ù„ Â«{{title}}Â» Ù…Ø·Ù…Ø¦Ù† Ù‡Ø³ØªÛŒØ¯ØŸ",
                    title: deleteControlCandidate?.title ?? "",
                })}
                confirmText={t("control.actions.deleteAssignment", {
                    defaultValue: "Ø­Ø°Ù Ø§ØªØµØ§Ù„ Ú©Ù†ØªØ±Ù„",
                })}
                cancelText={t("common.cancel", { defaultValue: "Ø§Ù†ØµØ±Ø§Ù" })}
                loading={submitting}
                onClose={() => setDeleteControlCandidate(null)}
                onConfirm={() => {
                    void handleConfirmControlDelete();
                }}
            />
        </>
    );
}
