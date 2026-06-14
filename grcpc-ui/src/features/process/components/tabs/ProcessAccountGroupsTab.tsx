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

import type { AccountGroupNode } from "@/features/account-group";
import { accountGroupService } from "@/features/account-group";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import type {
    ProcessAccountGroupAssignment,
    ProcessAccountGroupAssignmentType,
} from "../../domain/process-account-group-assignment.model";
import { processAccountGroupAssignmentService } from "../../service/process-account-group-assignment.service";

interface ProcessAccountGroupsTabProps {
    processId: string | null;
    readOnly?: boolean;
}

type AccountGroupsLoadStatus = "idle" | "loading" | "success" | "error";

interface AccountGroupsLoadState {
    processId: string | null;
    retryKey: number;
    status: AccountGroupsLoadStatus;
    assignments: ProcessAccountGroupAssignment[];
    accountGroupOptions: AccountGroupNode[];
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

const ACCOUNT_GROUP_COMBOBOX_STYLE: CSSProperties = {
    width: "min(28rem, 100%)",
    minWidth: "18rem",
};

const EMPTY_ASSIGNMENTS: ProcessAccountGroupAssignment[] = [];
const EMPTY_ACCOUNT_GROUP_OPTIONS: AccountGroupNode[] = [];

function initialLoadState(processId: string | null): AccountGroupsLoadState {
    return {
        processId,
        retryKey: 0,
        status: processId ? "loading" : "idle",
        assignments: [],
        accountGroupOptions: [],
    };
}

function formatOptionalValue(value: string | null | undefined, fallback: string): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
}

function formatAccountGroupOption(accountGroup: AccountGroupNode, fallback: string): string {
    return `${formatOptionalValue(accountGroup.code, fallback)} - ${formatOptionalValue(
        accountGroup.title,
        fallback,
    )}`;
}

function formatAssignmentOption(
    assignment: ProcessAccountGroupAssignment,
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
    assignmentType: ProcessAccountGroupAssignmentType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ProcessAccountGroupAssignmentType, string> = {
        scope: t("process.accountGroups.assignmentTypes.scope"),
        owner: t("process.accountGroups.assignmentTypes.owner"),
        participant: t("process.accountGroups.assignmentTypes.participant"),
    };

    return map[assignmentType];
}

function resolveStatusLabel(
    status: ProcessAccountGroupAssignment["status"],
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ProcessAccountGroupAssignment["status"], string> = {
        active: t("process.status.active"),
        inactive: t("process.status.inactive"),
    };

    return map[status];
}

export default function ProcessAccountGroupsTab({
    processId,
    readOnly = false,
}: ProcessAccountGroupsTabProps) {
    const { t } = useTranslation();
    const requestSeq = useRef(0);
    const [retryKey, setRetryKey] = useState(0);
    const [selectedAccountGroupId, setSelectedAccountGroupId] = useState("");
    const [selectedAccountGroupSearchValue, setSelectedAccountGroupSearchValue] = useState("");
    const [mutationBusy, setMutationBusy] = useState(false);
    const [mutationError, setMutationError] = useState(false);
    const [removeCandidate, setRemoveCandidate] =
        useState<ProcessAccountGroupAssignment | null>(null);
    const [loadState, setLoadState] = useState<AccountGroupsLoadState>(() =>
        initialLoadState(processId),
    );

    useEffect(() => {
        if (!processId) {
            return;
        }

        const requestId = requestSeq.current + 1;
        requestSeq.current = requestId;

        Promise.all([
            processAccountGroupAssignmentService.listByProcess(processId),
            accountGroupService.list(),
        ])
            .then(([assignments, accountGroupOptions]) => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    processId,
                    retryKey,
                    status: "success",
                    assignments,
                    accountGroupOptions,
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
                    accountGroupOptions: [],
                });
            });

        return () => {
            if (requestSeq.current === requestId) {
                requestSeq.current += 1;
            }
        };
    }, [processId, retryKey]);

    const noneText = t("common.none");
    const accountGroupsTitle = t("process.accountGroups.title");
    const isCurrentLoad =
        loadState.processId === processId && loadState.retryKey === retryKey;
    const assignments = isCurrentLoad ? loadState.assignments : EMPTY_ASSIGNMENTS;
    const accountGroupOptions = isCurrentLoad
        ? loadState.accountGroupOptions
        : EMPTY_ACCOUNT_GROUP_OPTIONS;
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
    const assignedAccountGroupIds = useMemo(
        () => new Set(assignments.map((assignment) => assignment.accountGroupId)),
        [assignments],
    );
    const availableAccountGroups = useMemo(
        () =>
            accountGroupOptions.filter(
                (accountGroup) => !assignedAccountGroupIds.has(accountGroup.id),
            ),
        [accountGroupOptions, assignedAccountGroupIds],
    );
    const selectedAccountGroup = availableAccountGroups.find(
        (accountGroup) => accountGroup.id === selectedAccountGroupId,
    );
    const accountGroupComboBoxValue = selectedAccountGroup
        ? formatAccountGroupOption(selectedAccountGroup, noneText)
        : selectedAccountGroupSearchValue;
    const removeCandidateLabel = removeCandidate
        ? formatAssignmentOption(removeCandidate, noneText)
        : "";
    const canAssign =
        !readOnly &&
        !!processId &&
        !!selectedAccountGroupId &&
        availableAccountGroups.some((accountGroup) => accountGroup.id === selectedAccountGroupId) &&
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
            await processAccountGroupAssignmentService.create({
                processNodeId: processId,
                accountGroupId: selectedAccountGroupId,
                assignmentType: "scope",
                isActive: true,
            });
            setSelectedAccountGroupId("");
            setSelectedAccountGroupSearchValue("");
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
            await processAccountGroupAssignmentService.remove(removeCandidate.assignmentId);
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
                <Title level="H5">{accountGroupsTitle}</Title>

                <div style={{ height: "0.75rem" }} />

                <MessageStrip design="Information" hideCloseButton>
                    {t("process.accountGroups.saveFirst")}
                </MessageStrip>
            </div>
        );
    }

    if (hasError) {
        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">{accountGroupsTitle}</Title>

                <div style={{ height: "0.75rem" }} />

                <MessageStrip design="Negative" hideCloseButton>
                    {t("process.accountGroups.loadError")}
                </MessageStrip>

                <div style={ERROR_ACTION_STYLE}>
                    <Button
                        design="Emphasized"
                        disabled={isLoading}
                        onClick={refresh}
                    >
                        {t("process.accountGroups.retry")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={TABLE_PANEL_STYLE}>
            <Title level="H5">{accountGroupsTitle}</Title>

            <div style={{ height: "0.75rem" }} />

            {!readOnly ? (
                <div style={ASSIGNMENT_TOOLBAR_STYLE}>
                    <ComboBox
                        accessibleName={t("process.accountGroups.assignAccessibleName")}
                        filter="Contains"
                        placeholder={t("process.accountGroups.assignPlaceholder")}
                        showClearIcon
                        style={ACCOUNT_GROUP_COMBOBOX_STYLE}
                        value={accountGroupComboBoxValue}
                        disabled={isLoading || mutationBusy || availableAccountGroups.length === 0}
                        onInput={(event) => {
                            const nextValue = readInputValue(event);
                            setSelectedAccountGroupSearchValue(nextValue);

                            const matchedOption = availableAccountGroups.find(
                                (accountGroup) =>
                                    formatAccountGroupOption(accountGroup, noneText) === nextValue,
                            );
                            setSelectedAccountGroupId(matchedOption?.id ?? "");
                        }}
                        onSelectionChange={(event) => {
                            const nextValue = readSelectedComboBoxDataValue(
                                event,
                                selectedAccountGroupId,
                            );
                            const selectedOption = availableAccountGroups.find(
                                (accountGroup) => accountGroup.id === nextValue,
                            );

                            setSelectedAccountGroupId(nextValue);
                            setSelectedAccountGroupSearchValue(
                                selectedOption
                                    ? formatAccountGroupOption(selectedOption, noneText)
                                    : "",
                            );
                        }}
                    >
                        {availableAccountGroups.map((accountGroup) => (
                            <ComboBoxItem
                                key={accountGroup.id}
                                data-value={accountGroup.id}
                                text={formatAccountGroupOption(accountGroup, noneText)}
                            />
                        ))}
                    </ComboBox>

                    <Button design="Emphasized" disabled={!canAssign} onClick={handleAssign}>
                        {t("process.accountGroups.assign")}
                    </Button>
                </div>
            ) : null}

            {availableAccountGroups.length === 0 && !isLoading ? (
                <>
                    <div style={{ height: "0.75rem" }} />
                    <MessageStrip design="Information" hideCloseButton>
                        {t("process.accountGroups.noAssignable")}
                    </MessageStrip>
                </>
            ) : null}

            {mutationError ? (
                <>
                    <div style={{ height: "0.75rem" }} />
                    <MessageStrip design="Negative" hideCloseButton>
                        {t("process.accountGroups.mutationError")}
                    </MessageStrip>
                </>
            ) : null}

            <div style={{ height: "0.75rem" }} />

            <Table
                accessibleName={t("process.accountGroups.tableAccessibleName")}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell width="8rem">
                            {t("process.accountGroups.columns.code")}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("process.accountGroups.columns.title")}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="14rem">
                            {t("process.accountGroups.columns.description")}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.accountGroups.columns.assignmentType")}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.accountGroups.columns.status")}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.accountGroups.columns.actions")}
                        </TableHeaderCell>
                    </TableHeaderRow>
                }
                loading={isLoading}
                loadingDelay={0}
                noDataText={t("process.accountGroups.empty")}
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
                                    {t("process.accountGroups.remove")}
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
                title={t("process.accountGroups.removeTitle")}
                message={t("process.accountGroups.removeConfirm", {
                    title: removeCandidateLabel,
                })}
                loading={mutationBusy}
                confirmText={t("process.accountGroups.confirmRemove")}
                cancelText={t("process.accountGroups.cancelRemove")}
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
