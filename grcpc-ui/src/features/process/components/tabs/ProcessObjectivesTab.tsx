import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    ComboBox,
    ComboBoxItem,
    MessageStrip,
    Table,
    TableCell,
    TableHeaderCell,
    TableHeaderRow,
    TableRow,
    Title,
} from "@ui5/webcomponents-react";

import type { ObjectiveNode } from "@/features/objective";
import { objectiveService } from "@/features/objective";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import type {
    ProcessObjectiveAssignment,
    ProcessObjectiveAssignmentType,
} from "../../domain/process-objective-assignment.model";
import { processObjectiveAssignmentService } from "../../service/process-objective-assignment.service";

interface ProcessObjectivesTabProps {
    processId: string | null;
    readOnly?: boolean;
}

type ObjectivesLoadStatus = "idle" | "loading" | "success" | "error";

interface ObjectivesLoadState {
    processId: string | null;
    retryKey: number;
    status: ObjectivesLoadStatus;
    assignments: ProcessObjectiveAssignment[];
    objectiveOptions: ObjectiveNode[];
}

const TABLE_PANEL_STYLE: CSSProperties = {
    minHeight: "15rem",
    background: "var(--sapGroup_ContentBackground)",
    border: "1px solid var(--sapList_BorderColor)",
    padding: "1rem",
};

const ERROR_ACTION_STYLE: CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    paddingTop: "0.75rem",
};

const ASSIGNMENT_TOOLBAR_STYLE: CSSProperties = {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
};

const OBJECTIVE_COMBOBOX_STYLE: CSSProperties = {
    width: "min(28rem, 100%)",
    minWidth: "18rem",
};

const EMPTY_ASSIGNMENTS: ProcessObjectiveAssignment[] = [];
const EMPTY_OBJECTIVE_OPTIONS: ObjectiveNode[] = [];

function initialLoadState(processId: string | null): ObjectivesLoadState {
    return {
        processId,
        retryKey: 0,
        status: processId ? "loading" : "idle",
        assignments: [],
        objectiveOptions: [],
    };
}

function formatOptionalValue(value: string | null | undefined, fallback: string): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
}

function formatObjectiveOption(objective: ObjectiveNode, fallback: string): string {
    return `${formatOptionalValue(objective.code, fallback)} - ${formatOptionalValue(
        objective.title,
        fallback,
    )}`;
}

function formatAssignmentOption(
    assignment: ProcessObjectiveAssignment,
    fallback: string,
): string {
    return `${formatOptionalValue(assignment.code, fallback)} - ${formatOptionalValue(
        assignment.title,
        fallback,
    )}`;
}

function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

function readSelectedComboBoxDataValue(event: unknown, fallback: string): string {
    const selectedItem = (event as {
        detail?: {
            item?: {
                getAttribute?: (name: string) => string | null;
            };
        };
    }).detail?.item;

    return selectedItem?.getAttribute?.("data-value") ?? fallback;
}

function resolveAssignmentTypeLabel(
    assignmentType: ProcessObjectiveAssignmentType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ProcessObjectiveAssignmentType, string> = {
        scope: t("process.objectives.assignmentTypes.scope"),
        owner: t("process.objectives.assignmentTypes.owner"),
        participant: t("process.objectives.assignmentTypes.participant"),
    };

    return map[assignmentType];
}

function resolveStatusLabel(
    status: ProcessObjectiveAssignment["status"],
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ProcessObjectiveAssignment["status"], string> = {
        active: t("process.status.active"),
        inactive: t("process.status.inactive"),
    };

    return map[status];
}

export default function ProcessObjectivesTab({
    processId,
    readOnly = false,
}: ProcessObjectivesTabProps) {
    const { t } = useTranslation();
    const requestSeq = useRef(0);
    const [retryKey, setRetryKey] = useState(0);
    const [selectedObjectiveId, setSelectedObjectiveId] = useState("");
    const [selectedObjectiveSearchValue, setSelectedObjectiveSearchValue] = useState("");
    const [mutationBusy, setMutationBusy] = useState(false);
    const [mutationError, setMutationError] = useState(false);
    const [removeCandidate, setRemoveCandidate] =
        useState<ProcessObjectiveAssignment | null>(null);
    const [loadState, setLoadState] = useState<ObjectivesLoadState>(() =>
        initialLoadState(processId),
    );

    useEffect(() => {
        if (!processId) {
            return;
        }

        const requestId = requestSeq.current + 1;
        requestSeq.current = requestId;

        Promise.all([
            processObjectiveAssignmentService.listByProcess(processId),
            objectiveService.list(),
        ])
            .then(([assignments, objectiveOptions]) => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    processId,
                    retryKey,
                    status: "success",
                    assignments,
                    objectiveOptions,
                });
                setRemoveCandidate(null);
                setMutationError(false);
            })
            .catch(() => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    processId,
                    retryKey,
                    status: "error",
                    assignments: [],
                    objectiveOptions: [],
                });
            });

        return () => {
            if (requestSeq.current === requestId) {
                requestSeq.current += 1;
            }
        };
    }, [processId, retryKey]);

    const noneText = t("common.none");
    const objectivesTitle = t("process.objectives.title");
    const isCurrentLoad =
        loadState.processId === processId && loadState.retryKey === retryKey;
    const assignments = isCurrentLoad ? loadState.assignments : EMPTY_ASSIGNMENTS;
    const objectiveOptions = isCurrentLoad ? loadState.objectiveOptions : EMPTY_OBJECTIVE_OPTIONS;
    const isLoading =
        !!processId &&
        (loadState.processId !== processId ||
            loadState.retryKey !== retryKey ||
            loadState.status === "loading");
    const hasError =
        !!processId &&
        !isLoading &&
        loadState.processId === processId &&
        loadState.retryKey === retryKey &&
        loadState.status === "error";
    const assignedObjectiveIds = useMemo(
        () => new Set(assignments.map((assignment) => assignment.objectiveNodeId)),
        [assignments],
    );
    const availableObjectives = useMemo(
        () => objectiveOptions.filter((objective) => !assignedObjectiveIds.has(objective.id)),
        [assignedObjectiveIds, objectiveOptions],
    );
    const selectedObjective = availableObjectives.find(
        (objective) => objective.id === selectedObjectiveId,
    );
    const objectiveComboBoxValue = selectedObjective
        ? formatObjectiveOption(selectedObjective, noneText)
        : selectedObjectiveSearchValue;
    const removeCandidateLabel = removeCandidate
        ? formatAssignmentOption(removeCandidate, noneText)
        : "";
    const canAssign =
        !readOnly &&
        !!processId &&
        !!selectedObjectiveId &&
        availableObjectives.some((objective) => objective.id === selectedObjectiveId) &&
        !isLoading &&
        !mutationBusy;

    const refresh = () => setRetryKey((current) => current + 1);

    const handleAssign = async () => {
        if (readOnly || !processId || !canAssign) {
            return;
        }

        setMutationBusy(true);
        setMutationError(false);

        try {
            await processObjectiveAssignmentService.create({
                processNodeId: processId,
                objectiveNodeId: selectedObjectiveId,
                assignmentType: "scope",
                isActive: true,
            });
            setSelectedObjectiveId("");
            setSelectedObjectiveSearchValue("");
            refresh();
        } catch {
            setMutationError(true);
        } finally {
            setMutationBusy(false);
        }
    };

    const handleRemove = async () => {
        if (readOnly || !removeCandidate) {
            return;
        }

        setMutationBusy(true);
        setMutationError(false);

        try {
            await processObjectiveAssignmentService.remove(removeCandidate.assignmentId);
            setRemoveCandidate(null);
            refresh();
        } catch {
            setMutationError(true);
        } finally {
            setMutationBusy(false);
        }
    };

    if (!processId) {
        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">{objectivesTitle}</Title>

                <div style={{ height: "0.75rem" }} />

                <MessageStrip design="Information" hideCloseButton>
                    {t("process.objectives.saveFirst")}
                </MessageStrip>
            </div>
        );
    }

    if (hasError) {
        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">{objectivesTitle}</Title>

                <div style={{ height: "0.75rem" }} />

                <MessageStrip design="Negative" hideCloseButton>
                    {t("process.objectives.loadError")}
                </MessageStrip>

                <div style={ERROR_ACTION_STYLE}>
                    <Button
                        design="Emphasized"
                        disabled={isLoading}
                        onClick={refresh}
                    >
                        {t("process.objectives.retry")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={TABLE_PANEL_STYLE}>
            <Title level="H5">{objectivesTitle}</Title>

            <div style={{ height: "0.75rem" }} />

            {!readOnly ? (
                <div style={ASSIGNMENT_TOOLBAR_STYLE}>
                    <ComboBox
                        accessibleName={t("process.objectives.assignAccessibleName")}
                        filter="Contains"
                        placeholder={t("process.objectives.assignPlaceholder")}
                        showClearIcon
                        style={OBJECTIVE_COMBOBOX_STYLE}
                        value={objectiveComboBoxValue}
                        disabled={isLoading || mutationBusy || availableObjectives.length === 0}
                        onInput={(event) => {
                            const nextValue = readInputValue(event);
                            setSelectedObjectiveSearchValue(nextValue);

                            const matchedOption = availableObjectives.find(
                                (objective) => formatObjectiveOption(objective, noneText) === nextValue,
                            );
                            setSelectedObjectiveId(matchedOption?.id ?? "");
                        }}
                        onSelectionChange={(event) => {
                            const nextValue = readSelectedComboBoxDataValue(event, selectedObjectiveId);
                            const selectedOption = availableObjectives.find(
                                (objective) => objective.id === nextValue,
                            );

                            setSelectedObjectiveId(nextValue);
                            setSelectedObjectiveSearchValue(
                                selectedOption ? formatObjectiveOption(selectedOption, noneText) : "",
                            );
                        }}
                    >
                        {availableObjectives.map((objective) => (
                            <ComboBoxItem
                                key={objective.id}
                                data-value={objective.id}
                                text={formatObjectiveOption(objective, noneText)}
                            />
                        ))}
                    </ComboBox>

                    <Button design="Emphasized" disabled={!canAssign} onClick={handleAssign}>
                        {t("process.objectives.assign")}
                    </Button>
                </div>
            ) : null}

            {availableObjectives.length === 0 && !isLoading ? (
                <>
                    <div style={{ height: "0.75rem" }} />
                    <MessageStrip design="Information" hideCloseButton>
                        {t("process.objectives.noAssignable")}
                    </MessageStrip>
                </>
            ) : null}

            {mutationError ? (
                <>
                    <div style={{ height: "0.75rem" }} />
                    <MessageStrip design="Negative" hideCloseButton>
                        {t("process.objectives.mutationError")}
                    </MessageStrip>
                </>
            ) : null}

            <div style={{ height: "0.75rem" }} />

            <Table
                accessibleName={t("process.objectives.tableAccessibleName")}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell width="8rem">
                            {t("process.objectives.columns.code")}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("process.objectives.columns.title")}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="14rem">
                            {t("process.objectives.columns.description")}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.objectives.columns.assignmentType")}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.objectives.columns.status")}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.objectives.columns.actions")}
                        </TableHeaderCell>
                    </TableHeaderRow>
                }
                loading={isLoading}
                loadingDelay={0}
                noDataText={t("process.objectives.empty")}
                overflowMode="Popin"
            >
                {assignments.map((assignment) => (
                    <TableRow key={assignment.assignmentId} rowKey={assignment.assignmentId}>
                        <TableCell>{formatOptionalValue(assignment.code, noneText)}</TableCell>
                        <TableCell>{formatOptionalValue(assignment.title, noneText)}</TableCell>
                        <TableCell>
                            {formatOptionalValue(assignment.description, noneText)}
                        </TableCell>
                        <TableCell>
                            {resolveAssignmentTypeLabel(assignment.assignmentType, t)}
                        </TableCell>
                        <TableCell>{resolveStatusLabel(assignment.status, t)}</TableCell>
                        <TableCell>
                            {!readOnly ? (
                                <Button
                                    design="Transparent"
                                    disabled={mutationBusy}
                                    onClick={() => setRemoveCandidate(assignment)}
                                >
                                    {t("process.objectives.remove")}
                                </Button>
                            ) : (
                                noneText
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </Table>

            <DeleteConfirmDialog
                open={!!removeCandidate}
                title={t("process.objectives.removeTitle")}
                message={t("process.objectives.removeConfirm", {
                    title: removeCandidateLabel,
                })}
                loading={mutationBusy}
                confirmText={t("process.objectives.confirmRemove")}
                cancelText={t("process.objectives.cancelRemove")}
                onClose={() => {
                    if (!mutationBusy) {
                        setRemoveCandidate(null);
                    }
                }}
                onConfirm={handleRemove}
            />
        </div>
    );
}
