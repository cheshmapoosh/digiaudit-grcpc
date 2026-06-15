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
    OrganizationReferenceAssignment,
    OrganizationReferenceOption,
    OrganizationReferenceType,
    OrganizationReferenceView,
    OrganizationRiskAssignment,
    OrganizationRiskOption,
    OrganizationSubProcessOption,
    OrganizationSubProcessView,
} from "../domain/organization-process-assignment.model";
import type { ProcessNode } from "@/features/process";
import {
    ROOT_PARENT as PROCESS_ROOT_PARENT,
    useProcessState,
} from "@/features/process";
import type { RiskNode } from "@/features/risk";
import {
    ROOT_PARENT as RISK_ROOT_PARENT,
    useRiskState,
} from "@/features/risk";
import type { PolicyNode } from "@/features/policy";
import {
    ROOT_PARENT as POLICY_ROOT_PARENT,
    usePolicyState,
} from "@/features/policy";
import type { RegulationNode } from "@/features/regulation";
import {
    ROOT_PARENT as REGULATION_ROOT_PARENT,
    useRegulationState,
} from "@/features/regulation";
import type { ObjectiveNode } from "@/features/objective";
import {
    ROOT_PARENT as OBJECTIVE_ROOT_PARENT,
    useObjectiveState,
} from "@/features/objective";
import { controlService, type ControlSummary } from "@/features/control";
import type { DocumentAttachment, DocumentUploadPolicy } from "@/features/document";
import { useDocumentAttachmentState } from "@/features/document";

import { useOrganizationState, ROOT_PARENT } from "../state/organization.state";
import { useOrganizationProcessAssignmentState } from "../state/organization-process-assignment.state";
import { useOrganizationProcessRelationshipState } from "../state/organization-process-relationship.state";
import { useOrganizationReferenceAssignmentState } from "../state/organization-reference-assignment.state";
import { hasChildren, sortOrganizations } from "../utils/organization.tree";

import OrganizationSummaryPanel from "../components/OrganizationSummaryPanel";
import OrganizationsListReport from "./OrganizationsListReport";
import OrganizationObjectPage, { type OrganizationTabKey } from "./OrganizationObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

const DIALOG_WIDTH = "90vw";
const EMPTY_ASSIGNMENTS: OrganizationProcessAssignment[] = [];
const EMPTY_RISKS: OrganizationRiskAssignment[] = [];
const EMPTY_REFERENCE_ASSIGNMENTS: OrganizationReferenceAssignment[] = [];
const EMPTY_DOCUMENTS: DocumentAttachment[] = [];
const DOCUMENT_TARGET_TYPE = "ORGANIZATION";
const REFERENCE_TYPES: readonly OrganizationReferenceType[] = [
    "CONTROL",
    "REGULATION",
    "POLICY",
    "OBJECTIVE",
];
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

function sortRiskNodes(items: RiskNode[]): RiskNode[] {
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

function sortReferenceNodes<T extends { code: string; title: string; sortOrder?: number }>(
    items: T[],
): T[] {
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

function toRiskOption(risk: RiskNode): OrganizationRiskOption {
    return {
        riskNodeId: risk.id,
        code: risk.code,
        title: risk.title,
        riskType: risk.riskType,
        status: risk.status,
        description: risk.description,
    };
}

function toControlReferenceOption(control: ControlSummary): OrganizationReferenceOption {
    return {
        referenceId: control.id,
        code: control.code,
        title: control.name,
        description: control.description ?? undefined,
        status: control.status,
        ownerName: undefined,
        typeLabel: control.controlClass ?? control.automationType ?? control.controlNature ?? undefined,
        validFrom: undefined,
        validTo: undefined,
    };
}

function toRegulationReferenceOption(regulation: RegulationNode): OrganizationReferenceOption {
    return {
        referenceId: regulation.id,
        code: regulation.code,
        title: regulation.title,
        description: regulation.description,
        status: regulation.status,
        ownerName: regulation.ownerName,
        typeLabel: regulation.issuer,
        validFrom: regulation.effectiveDate,
        validTo: regulation.validTo,
    };
}

function toPolicyReferenceOption(policy: PolicyNode): OrganizationReferenceOption {
    return {
        referenceId: policy.id,
        code: policy.code,
        title: policy.title,
        description: policy.description,
        status: policy.status,
        ownerName: policy.ownerName,
        typeLabel: policy.policyKind,
        validFrom: policy.validFrom,
        validTo: policy.validTo,
    };
}

function toObjectiveReferenceOption(objective: ObjectiveNode): OrganizationReferenceOption {
    return {
        referenceId: objective.id,
        code: objective.code,
        title: objective.title,
        description: objective.description,
        status: objective.status,
        ownerName: objective.organizationUnitName,
        typeLabel: objective.objectiveType,
        validFrom: objective.effectiveFrom,
        validTo: objective.validUntil,
    };
}

function buildOrganizationSubProcessViews(
    assignments: OrganizationProcessAssignment[],
    nodesById: Record<string, ProcessNode>,
): OrganizationSubProcessView[] {
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
                controlsCount: 0,
            };

            return view;
        })
        .filter((item): item is OrganizationSubProcessView => item !== null)
        .sort((a, b) => {
            const codeCompare = a.code.localeCompare(b.code, "fa");
            return codeCompare !== 0 ? codeCompare : a.title.localeCompare(b.title, "fa");
        });
}

function buildOrganizationReferenceViews(
    assignments: OrganizationReferenceAssignment[],
    options: OrganizationReferenceOption[],
): OrganizationReferenceView[] {
    const optionsById = new Map(options.map((option) => [option.referenceId, option]));

    return assignments
        .map((assignment): OrganizationReferenceView | null => {
            const option = optionsById.get(assignment.referenceId);

            if (!option) {
                return null;
            }

            return {
                ...option,
                assignmentId: assignment.id,
                organizationId: assignment.organizationId,
                referenceType: assignment.referenceType,
                assignmentType: assignment.assignmentType,
                validFrom: assignment.validFrom ?? option.validFrom,
                validTo: assignment.validTo ?? option.validTo,
                isActive: assignment.isActive,
            };
        })
        .filter((item): item is OrganizationReferenceView => item !== null)
        .sort((a, b) => {
            const codeCompare = a.code.localeCompare(b.code, "fa");
            return codeCompare !== 0 ? codeCompare : a.title.localeCompare(b.title, "fa");
        });
}

function getReferenceAssignments(
    assignmentsByOrganizationAndType: Record<string, OrganizationReferenceAssignment[]>,
    organizationId: string | undefined,
    referenceType: OrganizationReferenceType,
): OrganizationReferenceAssignment[] {
    if (!organizationId) {
        return EMPTY_REFERENCE_ASSIGNMENTS;
    }

    return assignmentsByOrganizationAndType[`${organizationId}:${referenceType}`] ??
        EMPTY_REFERENCE_ASSIGNMENTS;
}

function createDocumentTempSessionId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDocumentTargetKey(targetType: string, targetId: string | undefined): string | null {
    return targetId ? `${targetType}:${targetId}` : null;
}

export default function OrganizationsFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { organizationId } = useParams();

    const routeMode = useOrganizationRouteMode();
    const appDir = useResolvedUiDir();
    const nodesById = useOrganizationState((state) => state.nodesById);
    const loading = useOrganizationState((state) => state.loading);
    const loadChildren = useOrganizationState((state) => state.loadChildren);
    const createNode = useOrganizationState((state) => state.createNode);
    const updateNode = useOrganizationState((state) => state.updateNode);
    const removeNode = useOrganizationState((state) => state.removeNode);
    const processNodesById = useProcessState((state) => state.nodesById);
    const processLoading = useProcessState((state) => state.loading);
    const loadProcessChildren = useProcessState((state) => state.loadChildren);
    const riskNodesById = useRiskState((state) => state.nodesById);
    const riskLoading = useRiskState((state) => state.loading);
    const loadRiskChildren = useRiskState((state) => state.loadChildren);
    const policyNodesById = usePolicyState((state) => state.nodesById);
    const policyLoading = usePolicyState((state) => state.loading);
    const loadPolicyChildren = usePolicyState((state) => state.loadChildren);
    const regulationNodesById = useRegulationState((state) => state.nodesById);
    const regulationLoading = useRegulationState((state) => state.loading);
    const loadRegulationChildren = useRegulationState((state) => state.loadChildren);
    const objectiveNodesById = useObjectiveState((state) => state.nodesById);
    const objectiveLoading = useObjectiveState((state) => state.loading);
    const loadObjectiveChildren = useObjectiveState((state) => state.loadChildren);
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
    const risksByOrganizationId = useOrganizationProcessRelationshipState(
        (state) => state.risksByOrganizationId,
    );
    const relationshipsLoading = useOrganizationProcessRelationshipState(
        (state) => state.loading,
    );
    const loadRisksForOrganization = useOrganizationProcessRelationshipState(
        (state) => state.loadRisksForOrganization,
    );
    const assignRiskToOrganization = useOrganizationProcessRelationshipState(
        (state) => state.assignRisk,
    );
    const removeRiskFromOrganization = useOrganizationProcessRelationshipState(
        (state) => state.removeRiskAssignment,
    );
    const referenceAssignmentsByOrganizationAndType = useOrganizationReferenceAssignmentState(
        (state) => state.assignmentsByOrganizationAndType,
    );
    const referenceAssignmentsLoading = useOrganizationReferenceAssignmentState(
        (state) => state.loading,
    );
    const loadReferenceAssignmentsForOrganization = useOrganizationReferenceAssignmentState(
        (state) => state.loadForOrganization,
    );
    const assignReferenceToOrganization = useOrganizationReferenceAssignmentState(
        (state) => state.assignReference,
    );
    const removeReferenceFromOrganization = useOrganizationReferenceAssignmentState(
        (state) => state.removeAssignment,
    );
    const documentsByTarget = useDocumentAttachmentState((state) => state.documentsByTarget);
    const tempDocumentsBySession = useDocumentAttachmentState(
        (state) => state.tempDocumentsBySession,
    );
    const documentUploadPoliciesByTargetType = useDocumentAttachmentState(
        (state) => state.uploadPoliciesByTargetType,
    );
    const documentsLoading = useDocumentAttachmentState((state) => state.loading);
    const loadDocumentsForTarget = useDocumentAttachmentState((state) => state.loadForTarget);
    const loadTempDocuments = useDocumentAttachmentState((state) => state.loadTemp);
    const loadDocumentUploadPolicy = useDocumentAttachmentState(
        (state) => state.loadUploadPolicy,
    );
    const uploadTempDocument = useDocumentAttachmentState((state) => state.uploadTemp);
    const commitTempDocuments = useDocumentAttachmentState((state) => state.commitTemp);
    const updateDocumentTitle = useDocumentAttachmentState((state) => state.updateTitle);
    const deleteDocument = useDocumentAttachmentState((state) => state.deleteDocument);
    const createDocumentDownloadUrl = useDocumentAttachmentState(
        (state) => state.createDownloadUrl,
    );

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [objectError, setObjectError] = useState<string | null>(null);
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
    const [documentTempSessionId, setDocumentTempSessionId] = useState(
        createDocumentTempSessionId,
    );
    const [controlItems, setControlItems] = useState<ControlSummary[]>([]);
    const [controlLoading, setControlLoading] = useState(false);

    const items = useMemo(() => sortOrganizations(Object.values(nodesById)), [nodesById]);
    const processItems = useMemo(
        () => sortProcessNodes(Object.values(processNodesById)),
        [processNodesById],
    );
    const riskItems = useMemo(
        () => sortRiskNodes(Object.values(riskNodesById)),
        [riskNodesById],
    );
    const policyItems = useMemo(
        () => sortReferenceNodes(Object.values(policyNodesById)),
        [policyNodesById],
    );
    const regulationItems = useMemo(
        () => sortReferenceNodes(Object.values(regulationNodesById)),
        [regulationNodesById],
    );
    const objectiveItems = useMemo(
        () => sortReferenceNodes(Object.values(objectiveNodesById)),
        [objectiveNodesById],
    );
    const availableSubProcesses = useMemo(
        () =>
            processItems
                .filter((item) => item.nodeType === "subProcess")
                .map((item) => toSubProcessOption(item, processNodesById)),
        [processItems, processNodesById],
    );
    const availableRiskTemplates = useMemo(
        () =>
            riskItems
                .filter((item) => item.nodeType === "riskTemplate")
                .map(toRiskOption),
        [riskItems],
    );
    const availableControlReferences = useMemo(
        () => controlItems.map(toControlReferenceOption),
        [controlItems],
    );
    const availableRegulationReferences = useMemo(
        () =>
            regulationItems
                .filter((item) => item.nodeType === "law")
                .map(toRegulationReferenceOption),
        [regulationItems],
    );
    const availablePolicyReferences = useMemo(
        () =>
            policyItems
                .filter((item) => item.nodeType === "policy")
                .map(toPolicyReferenceOption),
        [policyItems],
    );
    const availableObjectiveReferences = useMemo(
        () => objectiveItems.map(toObjectiveReferenceOption),
        [objectiveItems],
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
        setDocumentTempSessionId(createDocumentTempSessionId());
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

    useEffect(() => {
        void loadRiskChildren(RISK_ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("risk.errors.loadList", {
                        defaultValue: "خطا در بارگذاری ریسک‌ها",
                    }),
                ),
            );
        });
    }, [loadRiskChildren, t]);

    useEffect(() => {
        let cancelled = false;

        setControlLoading(true);

        void controlService.list()
            .then((items) => {
                if (!cancelled) {
                    setControlItems(items);
                }
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    setPageError(
                        mapError(
                            error,
                            t("control.errors.loadList", {
                                defaultValue: "خطا در بارگذاری کنترل‌ها",
                            }),
                        ),
                    );
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setControlLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [t]);

    useEffect(() => {
        void Promise.all([
            loadPolicyChildren(POLICY_ROOT_PARENT),
            loadRegulationChildren(REGULATION_ROOT_PARENT),
            loadObjectiveChildren(OBJECTIVE_ROOT_PARENT),
        ]).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("organization.references.errors.loadCatalog", {
                        defaultValue: "خطا در بارگذاری قوانین، سیاست ها و اهداف",
                    }),
                ),
            );
        });
    }, [loadObjectiveChildren, loadPolicyChildren, loadRegulationChildren, t]);

    useEffect(() => {
        void loadDocumentUploadPolicy(DOCUMENT_TARGET_TYPE).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("organization.documents.errors.loadPolicy", {
                        defaultValue: "خطا در بارگذاری تنظیمات آپلود مستندات",
                    }),
                ),
            );
        });
    }, [loadDocumentUploadPolicy, t]);

    useEffect(() => {
        void loadTempDocuments(DOCUMENT_TARGET_TYPE, documentTempSessionId).catch(
            (error: unknown) => {
                setObjectError(
                    mapError(
                        error,
                        t("organization.documents.errors.loadTemp", {
                            defaultValue: "خطا در بارگذاری مستندات موقت",
                        }),
                    ),
                );
            },
        );
    }, [documentTempSessionId, loadTempDocuments, t]);

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
        setPageError(null);
        setSelectedTreeId(id);
        setTreeExpansionAnchorId(id);
    }, []);

    /**
     * دکمه نمایش:
     * modal نمایش سازمان را باز می‌کند.
     */
    const handleShow = useCallback(
        (id: string) => {
            setObjectError(null);
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
        setObjectError(null);

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

            setObjectError(null);
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
        setObjectError(null);

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

    const commitOrganizationTempDocuments = useCallback(
        async (targetId: string) => {
            const tempDocuments = tempDocumentsBySession[documentTempSessionId] ?? [];
            if (tempDocuments.length === 0) {
                return;
            }

            await commitTempDocuments({
                tempSessionId: documentTempSessionId,
                targetType: DOCUMENT_TARGET_TYPE,
                targetId,
                documentIds: tempDocuments.map((documentItem) => documentItem.id),
                documentTitles: Object.fromEntries(
                    tempDocuments.map((documentItem) => [
                        documentItem.id,
                        documentItem.title || documentItem.originalFileName,
                    ]),
                ),
            });
        },
        [commitTempDocuments, documentTempSessionId, tempDocumentsBySession],
    );

    const handleSubmitCreate = useCallback(
        async (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => {
            try {
                setSubmitting(true);
                setObjectError(null);

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
                await commitOrganizationTempDocuments(created.id);

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
                setObjectError(
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
        [commitOrganizationTempDocuments, createNode, navigate, t],
    );

    const handleSubmitUpdate = useCallback(
        async (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => {
            if (!organizationId) {
                return;
            }

            try {
                setSubmitting(true);
                setObjectError(null);

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
                    location:
                        typeof payload.location === "string"
                            ? payload.location.trim() || undefined
                            : payload.location,
                };

                await updateNode(organizationId, updatePayload);
                await commitOrganizationTempDocuments(organizationId);

                setSelectedTreeId(organizationId);
                setTreeExpansionAnchorId(updatePayload.parentId ?? organizationId);

                navigate(`/organizations/${organizationId}`);
            } catch (error) {
                setObjectError(
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
        [commitOrganizationTempDocuments, navigate, organizationId, t, updateNode],
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

        void Promise.all([
            loadAssignmentsForOrganization(objectValue.id),
            loadRisksForOrganization(objectValue.id),
            loadDocumentsForTarget(DOCUMENT_TARGET_TYPE, objectValue.id),
            ...REFERENCE_TYPES.map((referenceType) =>
                loadReferenceAssignmentsForOrganization(objectValue.id, referenceType),
            ),
        ]).catch((error: unknown) => {
            setObjectError(
                mapError(
                    error,
                    t("organization.relationships.errors.load", {
                        defaultValue: "خطا در بارگذاری ارتباطات سازمان",
                    }),
                ),
            );
        });
    }, [
        loadAssignmentsForOrganization,
        loadDocumentsForTarget,
        loadRisksForOrganization,
        loadReferenceAssignmentsForOrganization,
        objectValue?.id,
        showModal,
        t,
    ]);

    const currentAssignments = objectValue?.id
        ? assignmentsByOrganizationId[objectValue.id] ?? EMPTY_ASSIGNMENTS
        : EMPTY_ASSIGNMENTS;
    const organizationRisks = objectValue?.id
        ? risksByOrganizationId[objectValue.id] ?? EMPTY_RISKS
        : EMPTY_RISKS;
    const organizationDocumentTargetKey = getDocumentTargetKey(
        DOCUMENT_TARGET_TYPE,
        objectValue?.id || undefined,
    );
    const organizationDocuments = organizationDocumentTargetKey
        ? documentsByTarget[organizationDocumentTargetKey] ?? EMPTY_DOCUMENTS
        : EMPTY_DOCUMENTS;
    const organizationTempDocuments =
        tempDocumentsBySession[documentTempSessionId] ?? EMPTY_DOCUMENTS;
    const organizationDocumentUploadPolicy: DocumentUploadPolicy | undefined =
        documentUploadPoliciesByTargetType[DOCUMENT_TARGET_TYPE];

    const organizationSubProcesses = useMemo(
        () => buildOrganizationSubProcessViews(currentAssignments, processNodesById),
        [currentAssignments, processNodesById],
    );
    const organizationControlReferences = useMemo(
        () =>
            buildOrganizationReferenceViews(
                getReferenceAssignments(
                    referenceAssignmentsByOrganizationAndType,
                    objectValue?.id,
                    "CONTROL",
                ),
                availableControlReferences,
            ),
        [
            availableControlReferences,
            objectValue?.id,
            referenceAssignmentsByOrganizationAndType,
        ],
    );
    const organizationRegulationReferences = useMemo(
        () =>
            buildOrganizationReferenceViews(
                getReferenceAssignments(
                    referenceAssignmentsByOrganizationAndType,
                    objectValue?.id,
                    "REGULATION",
                ),
                availableRegulationReferences,
            ),
        [
            availableRegulationReferences,
            objectValue?.id,
            referenceAssignmentsByOrganizationAndType,
        ],
    );
    const organizationPolicyReferences = useMemo(
        () =>
            buildOrganizationReferenceViews(
                getReferenceAssignments(
                    referenceAssignmentsByOrganizationAndType,
                    objectValue?.id,
                    "POLICY",
                ),
                availablePolicyReferences,
            ),
        [
            availablePolicyReferences,
            objectValue?.id,
            referenceAssignmentsByOrganizationAndType,
        ],
    );
    const organizationObjectiveReferences = useMemo(
        () =>
            buildOrganizationReferenceViews(
                getReferenceAssignments(
                    referenceAssignmentsByOrganizationAndType,
                    objectValue?.id,
                    "OBJECTIVE",
                ),
                availableObjectiveReferences,
            ),
        [
            availableObjectiveReferences,
            objectValue?.id,
            referenceAssignmentsByOrganizationAndType,
        ],
    );

    const handleAssignSubProcessToOrganization = useCallback(
        async (processNodeId: string) => {
            if (!objectValue?.id) {
                return;
            }

            try {
                setSubmitting(true);
                setObjectError(null);

                await assignSubProcessToOrganization({
                    organizationId: objectValue.id,
                    processNodeId,
                    assignmentType: "scope",
                    isActive: true,
                });
                await loadRisksForOrganization(objectValue.id);
            } catch (error) {
                setObjectError(
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
        [
            assignSubProcessToOrganization,
            loadRisksForOrganization,
            objectValue?.id,
            t,
        ],
    );

    const handleRemoveSubProcessAssignment = useCallback(
        async (assignmentId: string) => {
            if (!objectValue?.id) {
                return;
            }

            try {
                setSubmitting(true);
                setObjectError(null);

                await removeSubProcessFromOrganization(objectValue.id, assignmentId);
                await loadRisksForOrganization(objectValue.id);
            } catch (error) {
                setObjectError(
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
        [
            loadRisksForOrganization,
            objectValue?.id,
            removeSubProcessFromOrganization,
            t,
        ],
    );

    const handleAssignRiskToOrganization = useCallback(
        async (processNodeId: string, riskNodeId: string) => {
            if (!objectValue?.id) {
                return;
            }

            try {
                setSubmitting(true);
                setObjectError(null);

                await assignRiskToOrganization({
                    organizationId: objectValue.id,
                    processNodeId,
                    riskNodeId,
                    assignmentType: "scope",
                    isActive: true,
                });
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("organization.risks.errors.assign", {
                            defaultValue: "خطا در تخصیص ریسک به سازمان",
                        }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [assignRiskToOrganization, objectValue?.id, t],
    );

    const handleRemoveRiskAssignment = useCallback(
        async (assignmentId: string) => {
            if (!objectValue?.id) {
                return;
            }

            try {
                setSubmitting(true);
                setObjectError(null);

                await removeRiskFromOrganization(objectValue.id, assignmentId);
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("organization.risks.errors.remove", {
                            defaultValue: "خطا در حذف ریسک از سازمان",
                        }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [objectValue?.id, removeRiskFromOrganization, t],
    );

    const handleAssignReferenceToOrganization = useCallback(
        async (referenceType: OrganizationReferenceType, referenceId: string) => {
            if (!objectValue?.id) {
                return;
            }

            try {
                setSubmitting(true);
                setObjectError(null);

                await assignReferenceToOrganization({
                    organizationId: objectValue.id,
                    referenceType,
                    referenceId,
                    assignmentType: "scope",
                    isActive: true,
                });
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("organization.references.errors.assign", {
                            defaultValue: "خطا در تخصیص آیتم به سازمان",
                        }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [assignReferenceToOrganization, objectValue?.id, t],
    );

    const handleRemoveReferenceAssignment = useCallback(
        async (referenceType: OrganizationReferenceType, assignmentId: string) => {
            if (!objectValue?.id) {
                return;
            }

            try {
                setSubmitting(true);
                setObjectError(null);

                await removeReferenceFromOrganization(
                    objectValue.id,
                    referenceType,
                    assignmentId,
                );
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("organization.references.errors.remove", {
                            defaultValue: "خطا در حذف تخصیص از سازمان",
                        }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [objectValue?.id, removeReferenceFromOrganization, t],
    );

    const handleUploadOrganizationDocument = useCallback(
        async (file: File, onProgress?: (progress: number) => void) => {
            await uploadTempDocument(
                {
                    targetType: DOCUMENT_TARGET_TYPE,
                    targetId: objectValue?.id || null,
                    tempSessionId: documentTempSessionId,
                    title: file.name,
                    file,
                },
                onProgress,
            );
        },
        [documentTempSessionId, objectValue?.id, uploadTempDocument],
    );

    const handleUpdateOrganizationDocumentTitle = useCallback(
        async (documentId: string, title: string) => {
            try {
                setSubmitting(true);
                setObjectError(null);
                await updateDocumentTitle(documentId, title);
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("organization.documents.errors.updateTitle", {
                            defaultValue: "خطا در ثبت عنوان مستند",
                        }),
                    ),
                );
                throw error;
            } finally {
                setSubmitting(false);
            }
        },
        [t, updateDocumentTitle],
    );

    const handleDeleteOrganizationDocument = useCallback(
        async (documentId: string) => {
            try {
                setSubmitting(true);
                setObjectError(null);
                await deleteDocument(documentId);
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("organization.documents.errors.delete", {
                            defaultValue: "خطا در حذف مستند",
                        }),
                    ),
                );
                throw error;
            } finally {
                setSubmitting(false);
            }
        },
        [deleteDocument, t],
    );

    const handleDownloadOrganizationDocument = useCallback(
        async (documentId: string) => {
            try {
                setObjectError(null);
                const url = await createDocumentDownloadUrl(documentId);
                window.open(url, "_blank", "noopener,noreferrer");
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("organization.documents.errors.download", {
                            defaultValue: "خطا در دریافت لینک دانلود مستند",
                        }),
                    ),
                );
            }
        },
        [createDocumentDownloadUrl, t],
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
        const width = DIALOG_WIDTH;

        return {
            width,
            maxWidth: width,
            maxHeight: "calc(100vh - 2rem)",
        };
    }, []);

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
                onErrorClose={() => setPageError(null)}
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
                    onErrorClose={() => setPageError(null)}
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
                            key={`${objectValue.id || "new"}:${queryParentId ?? objectValue.parentId ?? "root"}`}
                            mode={objectMode}
                            allItems={items}
                            value={objectValue}
                            activeTab={objectActiveTab}
                            subProcesses={organizationSubProcesses}
                            availableSubProcesses={availableSubProcesses}
                            controlReferences={organizationControlReferences}
                            availableControlReferences={availableControlReferences}
                            regulationReferences={organizationRegulationReferences}
                            availableRegulationReferences={availableRegulationReferences}
                            policyReferences={organizationPolicyReferences}
                            availablePolicyReferences={availablePolicyReferences}
                            objectiveReferences={organizationObjectiveReferences}
                            availableObjectiveReferences={availableObjectiveReferences}
                            risks={organizationRisks}
                            availableRisks={availableRiskTemplates}
                            documents={organizationDocuments}
                            tempDocuments={organizationTempDocuments}
                            documentUploadPolicy={organizationDocumentUploadPolicy}
                            documentTempSessionId={documentTempSessionId}
                            subProcessesBusy={processLoading || assignmentsLoading}
                            relationshipsBusy={relationshipsLoading || riskLoading}
                            referencesBusy={
                                referenceAssignmentsLoading ||
                                controlLoading ||
                                regulationLoading ||
                                policyLoading ||
                                objectiveLoading
                            }
                            documentsBusy={documentsLoading}
                            busy={loading || submitting}
                            error={objectError}
                            onErrorClose={() => setObjectError(null)}
                            onSubmit={routeMode === "create" ? handleSubmitCreate : handleSubmitUpdate}
                            onCancel={handleCancel}
                            onEdit={() => handleEdit()}
                            onAssignSubProcess={handleAssignSubProcessToOrganization}
                            onRemoveSubProcessAssignment={handleRemoveSubProcessAssignment}
                            onAssignRisk={handleAssignRiskToOrganization}
                            onRemoveRiskAssignment={handleRemoveRiskAssignment}
                            onAssignReference={handleAssignReferenceToOrganization}
                            onRemoveReferenceAssignment={handleRemoveReferenceAssignment}
                            onUploadDocument={handleUploadOrganizationDocument}
                            onUpdateDocumentTitle={handleUpdateOrganizationDocumentTitle}
                            onDeleteDocument={handleDeleteOrganizationDocument}
                            onDownloadDocument={handleDownloadOrganizationDocument}
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
